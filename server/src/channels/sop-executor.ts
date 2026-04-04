// SOP Workflow Executor
// Handles executing SOPs step-by-step: script, agent, api, approval, manual

import { supabase } from './zalo-personal/supabase.js';
import { spawn } from 'child_process';
import path from 'path';
import type { Response } from 'express';

const PROJECT_ROOT = path.resolve(process.cwd(), '..');

// ═══ Types ═══

export interface StepDef {
  order: number;
  name: string;
  type: 'script' | 'agent' | 'api' | 'approval' | 'manual';
  config: Record<string, any>;
}

export interface ExecutionContext {
  sopId: string;
  executionId: string;
  triggeredBy: string;
  triggerContext: Record<string, any>;
  stepResults: StepResult[];
  // SSE response object for streaming (optional)
  sseRes?: Response;
}

export interface StepResult {
  order: number;
  name: string;
  status: 'success' | 'failed' | 'skipped' | 'waiting_approval' | 'rejected';
  output?: string;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

// ═══ SSE Helper ═══

function sendSSE(res: Response | undefined, event: string, data: any) {
  if (!res || res.writableEnded) return;
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

// ═══ Execute a full SOP ═══

export async function executeSop(
  sopId: string,
  triggeredBy: string,
  triggerContext: Record<string, any> = {},
  sseRes?: Response,
): Promise<{ executionId: string; status: string }> {
  // Fetch SOP definition
  const { data: sop, error: sopErr } = await supabase
    .from('gem_sops')
    .select('*')
    .eq('sop_id', sopId)
    .single();

  if (sopErr || !sop) {
    throw new Error(`Không tìm thấy SOP: ${sopId}`);
  }

  const steps: StepDef[] = sop.steps || [];
  if (steps.length === 0) {
    throw new Error(`SOP ${sopId} chưa có steps. Hãy thêm steps trước khi chạy.`);
  }

  // Create execution record
  const { data: execution, error: execErr } = await supabase
    .from('gem_sop_executions')
    .insert({
      sop_id: sopId,
      status: 'running',
      current_step: 1,
      step_results: [],
      triggered_by: triggeredBy,
      trigger_context: triggerContext,
    })
    .select()
    .single();

  if (execErr || !execution) {
    throw new Error(`Lỗi tạo execution: ${execErr?.message}`);
  }

  const executionId = execution.id;
  const ctx: ExecutionContext = {
    sopId,
    executionId,
    triggeredBy,
    triggerContext,
    stepResults: [],
    sseRes,
  };

  sendSSE(sseRes, 'execution:start', {
    executionId,
    sopId,
    sopName: sop.name,
    totalSteps: steps.length,
  });

  // Audit: execution started
  await supabase.from('gem_sop_audit').insert({
    sop_id: sopId,
    execution_id: executionId,
    action: 'execution_started',
    actor: triggeredBy,
    detail: { trigger_context: triggerContext },
  });

  // Execute steps sequentially
  let finalStatus = 'completed';
  for (const step of steps) {
    sendSSE(sseRes, 'step:start', { step: step.order, name: step.name, type: step.type });

    // Update current step in DB
    await supabase.from('gem_sop_executions')
      .update({ current_step: step.order })
      .eq('id', executionId);

    const result = await executeStep(step, ctx);
    ctx.stepResults.push(result);

    // Update step_results in DB
    await supabase.from('gem_sop_executions')
      .update({ step_results: ctx.stepResults })
      .eq('id', executionId);

    sendSSE(sseRes, 'step:complete', { step: step.order, result });

    if (result.status === 'waiting_approval') {
      finalStatus = 'paused';
      await supabase.from('gem_sop_executions')
        .update({ status: 'paused' })
        .eq('id', executionId);

      sendSSE(sseRes, 'execution:paused', {
        executionId,
        pausedAtStep: step.order,
        reason: 'Đang chờ phê duyệt',
      });
      return { executionId, status: 'paused' };
    }

    if (result.status === 'failed') {
      finalStatus = 'failed';
      await supabase.from('gem_sop_executions')
        .update({
          status: 'failed',
          error_message: result.error || 'Bước thực hiện thất bại',
          completed_at: new Date().toISOString(),
        })
        .eq('id', executionId);

      sendSSE(sseRes, 'execution:failed', {
        executionId,
        failedAtStep: step.order,
        error: result.error,
      });

      // Audit: execution failed
      await supabase.from('gem_sop_audit').insert({
        sop_id: sopId,
        execution_id: executionId,
        action: 'execution_failed',
        actor: 'system',
        detail: { failed_step: step.order, error: result.error },
      });

      return { executionId, status: 'failed' };
    }
  }

  // All steps completed
  await supabase.from('gem_sop_executions')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', executionId);

  sendSSE(sseRes, 'execution:complete', { executionId, totalSteps: steps.length });

  // Audit: execution completed
  await supabase.from('gem_sop_audit').insert({
    sop_id: sopId,
    execution_id: executionId,
    action: 'execution_completed',
    actor: 'system',
    detail: { steps_completed: steps.length },
  });

  return { executionId, status: finalStatus };
}

// ═══ Execute a single step ═══

export async function executeStep(step: StepDef, ctx: ExecutionContext): Promise<StepResult> {
  const startedAt = new Date().toISOString();
  const base: Omit<StepResult, 'status'> = {
    order: step.order,
    name: step.name,
    startedAt,
  };

  try {
    switch (step.type) {
      case 'script':
        return await executeScriptStep(step, ctx, base);
      case 'agent':
        return await executeAgentStep(step, ctx, base);
      case 'api':
        return await executeApiStep(step, ctx, base);
      case 'approval':
        return { ...base, status: 'waiting_approval', output: 'Đang chờ phê duyệt' };
      case 'manual':
        return { ...base, status: 'waiting_approval', output: step.config.instructions || 'Cần thao tác thủ công' };
      default:
        return { ...base, status: 'failed', error: `Loại step không hỗ trợ: ${step.type}`, completedAt: new Date().toISOString() };
    }
  } catch (err: any) {
    return { ...base, status: 'failed', error: err.message, completedAt: new Date().toISOString() };
  }
}

// ═══ Script step: spawn child process ═══

async function executeScriptStep(step: StepDef, ctx: ExecutionContext, base: Omit<StepResult, 'status'>): Promise<StepResult> {
  const { command, args = [], cwd, timeout = 120000 } = step.config;
  if (!command) {
    return { ...base, status: 'failed', error: 'Thiếu command trong config', completedAt: new Date().toISOString() };
  }

  const workDir = cwd || PROJECT_ROOT;

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let resolved = false;

    const proc = spawn(command, args, {
      shell: true,
      cwd: workDir,
      env: { ...process.env, PYTHONUTF8: '1' },
    });

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        proc.kill('SIGTERM');
        resolve({ ...base, status: 'failed', error: `Timeout sau ${timeout}ms`, completedAt: new Date().toISOString() });
      }
    }, timeout);

    proc.stdout?.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      sendSSE(ctx.sseRes, 'step:stdout', { step: step.order, text });
    });

    proc.stderr?.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      sendSSE(ctx.sseRes, 'step:stderr', { step: step.order, text });
    });

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (resolved) return;
      resolved = true;

      if (code === 0) {
        resolve({ ...base, status: 'success', output: stdout.slice(-4000), completedAt: new Date().toISOString() });
      } else {
        resolve({ ...base, status: 'failed', error: `Exit code ${code}: ${stderr.slice(-2000)}`, completedAt: new Date().toISOString() });
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      if (resolved) return;
      resolved = true;
      resolve({ ...base, status: 'failed', error: `Spawn error: ${err.message}`, completedAt: new Date().toISOString() });
    });
  });
}

// ═══ Agent step: placeholder (will be integrated with Paperclip agents later) ═══

async function executeAgentStep(step: StepDef, _ctx: ExecutionContext, base: Omit<StepResult, 'status'>): Promise<StepResult> {
  const { agent_slug, prompt } = step.config;
  console.log(`[SOP Executor] Agent step: ${agent_slug} — "${prompt?.slice(0, 100)}"`);

  // Placeholder: log and return mock success
  // TODO: Route to real Paperclip agent via consumer or direct API
  return {
    ...base,
    status: 'success',
    output: `[Placeholder] Agent "${agent_slug}" sẽ thực hiện: ${prompt || step.name}`,
    completedAt: new Date().toISOString(),
  };
}

// ═══ API step: HTTP call ═══

async function executeApiStep(step: StepDef, _ctx: ExecutionContext, base: Omit<StepResult, 'status'>): Promise<StepResult> {
  const { url, method = 'POST', headers = {}, body } = step.config;
  if (!url) {
    return { ...base, status: 'failed', error: 'Thiếu url trong config', completedAt: new Date().toISOString() };
  }

  try {
    const resp = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await resp.text();
    if (!resp.ok) {
      return { ...base, status: 'failed', error: `HTTP ${resp.status}: ${text.slice(0, 1000)}`, completedAt: new Date().toISOString() };
    }

    return { ...base, status: 'success', output: text.slice(0, 4000), completedAt: new Date().toISOString() };
  } catch (err: any) {
    return { ...base, status: 'failed', error: `Fetch error: ${err.message}`, completedAt: new Date().toISOString() };
  }
}

// ═══ Approve a paused step ═══

export async function approveStep(executionId: string, stepOrder: number, approver: string = 'board'): Promise<{ status: string; executionId: string }> {
  const { data: execution, error } = await supabase
    .from('gem_sop_executions')
    .select('*')
    .eq('id', executionId)
    .single();

  if (error || !execution) {
    throw new Error(`Không tìm thấy execution: ${executionId}`);
  }

  if (execution.status !== 'paused') {
    throw new Error(`Execution không ở trạng thái paused (hiện tại: ${execution.status})`);
  }

  const stepResults: StepResult[] = execution.step_results || [];
  const stepIdx = stepResults.findIndex(r => r.order === stepOrder);
  if (stepIdx === -1) {
    throw new Error(`Không tìm thấy step ${stepOrder} trong kết quả`);
  }

  // Mark step as approved
  stepResults[stepIdx].status = 'success';
  stepResults[stepIdx].output = `Đã phê duyệt bởi ${approver}`;
  stepResults[stepIdx].completedAt = new Date().toISOString();

  await supabase.from('gem_sop_executions')
    .update({ step_results: stepResults, status: 'running' })
    .eq('id', executionId);

  // Audit
  await supabase.from('gem_sop_audit').insert({
    sop_id: execution.sop_id,
    execution_id: executionId,
    action: 'step_approved',
    actor: approver,
    detail: { step_order: stepOrder },
  });

  // Fetch SOP to get remaining steps
  const { data: sop } = await supabase
    .from('gem_sops')
    .select('steps, name')
    .eq('sop_id', execution.sop_id)
    .single();

  const allSteps: StepDef[] = sop?.steps || [];
  const remainingSteps = allSteps.filter(s => s.order > stepOrder);

  if (remainingSteps.length === 0) {
    // No more steps — mark completed
    await supabase.from('gem_sop_executions')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', executionId);
    return { status: 'completed', executionId };
  }

  // Continue executing remaining steps (without SSE for now)
  const ctx: ExecutionContext = {
    sopId: execution.sop_id,
    executionId,
    triggeredBy: execution.triggered_by,
    triggerContext: execution.trigger_context || {},
    stepResults,
  };

  for (const step of remainingSteps) {
    await supabase.from('gem_sop_executions')
      .update({ current_step: step.order })
      .eq('id', executionId);

    const result = await executeStep(step, ctx);
    ctx.stepResults.push(result);

    await supabase.from('gem_sop_executions')
      .update({ step_results: ctx.stepResults })
      .eq('id', executionId);

    if (result.status === 'waiting_approval') {
      await supabase.from('gem_sop_executions')
        .update({ status: 'paused' })
        .eq('id', executionId);
      return { status: 'paused', executionId };
    }

    if (result.status === 'failed') {
      await supabase.from('gem_sop_executions')
        .update({ status: 'failed', error_message: result.error, completed_at: new Date().toISOString() })
        .eq('id', executionId);
      return { status: 'failed', executionId };
    }
  }

  await supabase.from('gem_sop_executions')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', executionId);

  return { status: 'completed', executionId };
}

// ═══ Reject a paused step ═══

export async function rejectStep(
  executionId: string,
  stepOrder: number,
  feedback: string = '',
  rejector: string = 'board',
): Promise<{ status: string; executionId: string }> {
  const { data: execution, error } = await supabase
    .from('gem_sop_executions')
    .select('*')
    .eq('id', executionId)
    .single();

  if (error || !execution) {
    throw new Error(`Không tìm thấy execution: ${executionId}`);
  }

  if (execution.status !== 'paused') {
    throw new Error(`Execution không ở trạng thái paused (hiện tại: ${execution.status})`);
  }

  const stepResults: StepResult[] = execution.step_results || [];
  const stepIdx = stepResults.findIndex(r => r.order === stepOrder);
  if (stepIdx === -1) {
    throw new Error(`Không tìm thấy step ${stepOrder} trong kết quả`);
  }

  stepResults[stepIdx].status = 'rejected';
  stepResults[stepIdx].output = `Bị từ chối bởi ${rejector}: ${feedback}`;
  stepResults[stepIdx].completedAt = new Date().toISOString();

  await supabase.from('gem_sop_executions')
    .update({
      step_results: stepResults,
      status: 'rejected',
      error_message: `Step ${stepOrder} bị từ chối: ${feedback}`,
      completed_at: new Date().toISOString(),
    })
    .eq('id', executionId);

  // Audit
  await supabase.from('gem_sop_audit').insert({
    sop_id: execution.sop_id,
    execution_id: executionId,
    action: 'step_rejected',
    actor: rejector,
    detail: { step_order: stepOrder, feedback },
  });

  return { status: 'rejected', executionId };
}
