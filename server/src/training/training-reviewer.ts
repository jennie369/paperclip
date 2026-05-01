// Opus 4.6 post-training reviewer.
//
// After a training session ends (status='reviewing'), this module:
//   1. Loads the full transcript from agent_training_turns
//   2. Spawns Claude CLI with model=claude-opus-4-6
//   3. Asks Opus to score 10 rubric criteria + write qualitative feedback
//   4. Parses the structured JSON response
//   5. Inserts agent_training_scores rows
//   6. Appends a markdown summary to agents/{slug}/training-log.md
//   7. Marks session status='completed'
//
// The training-log.md is auto-loaded into sales-closer's system prompt by
// runViaOllama (Sprint B4) so each new round of feedback improves next reply.

import { spawnHidden } from '../spawn-hidden.js';
import { existsSync, readFileSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve as pathResolve } from 'node:path';
import { supabase } from '../channels/zalo-personal/supabase.js';

const PROJECT_ROOT = pathResolve(process.cwd(), '..', '..', 'crypto-pattern-scanner');

// ─────────────────────────────────────────────────────────────────────────────
// 10-criterion rubric — same set used in Sprint B1 schema design
// ─────────────────────────────────────────────────────────────────────────────

const RUBRIC = [
  { key: 'language_correctness', label: 'Tiếng Việt có dấu, ngữ pháp chính xác' },
  { key: 'tone_alignment', label: 'Tone sales closer thân thiện, không hình thức' },
  { key: 'hallucination_free', label: 'Không bịa info, không bịa marker, không bịa tool' },
  { key: 'marker_compliance', label: 'Chỉ dùng SEND_MEDIA + CALL đúng id, không leak' },
  { key: 'factual_accuracy', label: 'Giá, tên khóa, đối tượng đúng knowledge base' },
  { key: 'empathy', label: 'Hiểu pain point khách, đồng cảm' },
  { key: 'actionability', label: 'Đề xuất bước tiếp theo rõ ràng' },
  { key: 'brand_voice_jennie', label: 'Match DINH_VI_JENNIE brand voice' },
  { key: 'escalation_correctness', label: 'Biết khi nào escalate Jennie/team, khi nào tự xử lý' },
  { key: 'conciseness', label: 'Ngắn gọn 2-4 câu, không lan man' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Main entry — called from training-orchestrator.ts after loop ends
// ─────────────────────────────────────────────────────────────────────────────

export async function reviewTrainingSession(sessionId: string): Promise<void> {
  console.log(`[Training/Reviewer] Starting Opus review for session ${sessionId}`);

  // 1. Load session + turns
  const { data: session, error: sErr } = await supabase
    .from('agent_training_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();
  if (sErr || !session) {
    console.error(`[Training/Reviewer] Session ${sessionId} not found:`, sErr?.message);
    return;
  }

  const { data: turns } = await supabase
    .from('agent_training_turns')
    .select('turn_no, role, content, tool_calls, tool_results')
    .eq('session_id', sessionId)
    .order('turn_no', { ascending: true });

  if (!turns || turns.length === 0) {
    console.warn(`[Training/Reviewer] Session ${sessionId} has no turns to review`);
    await supabase.from('agent_training_sessions').update({ status: 'completed' }).eq('id', sessionId);
    return;
  }

  // 2. Build Opus prompt
  const transcript = turns
    .map((t: any) => `[Turn ${t.turn_no}] ${t.role.toUpperCase()}: ${t.content}`)
    .join('\n\n');

  const reviewerPrompt = buildReviewerPrompt(session.agent_slug, session.scenario_focus, transcript);

  // 3. Spawn Opus
  let opusOutput = '';
  try {
    opusOutput = await spawnClaudeCli(reviewerPrompt, session.reviewer_model || 'claude-opus-4-6');
  } catch (err: any) {
    console.error(`[Training/Reviewer] Opus spawn failed for ${sessionId}: ${err.message}`);
    await supabase
      .from('agent_training_sessions')
      .update({ status: 'failed', notes: `Opus reviewer failed: ${err.message}`.slice(0, 500) })
      .eq('id', sessionId);
    return;
  }

  // 4. Parse structured response (try JSON first, fallback to text scan)
  const parsed = parseReviewerOutput(opusOutput);

  // 5. Insert scores
  const overallScore = Math.round(
    parsed.scores.reduce((sum, s) => sum + s.score, 0) / Math.max(1, parsed.scores.length)
  );

  for (const s of parsed.scores) {
    try {
      await supabase.from('agent_training_scores').upsert({
        session_id: sessionId,
        rubric_key: s.key,
        score_0_100: s.score,
        opus_feedback: s.feedback,
      }, { onConflict: 'session_id,rubric_key' });
    } catch (err: any) {
      console.warn(`[Training/Reviewer] Score insert failed for ${s.key}: ${err.message}`);
    }
  }

  // 6. Append markdown summary to training-log.md
  const logPath = pathResolve(PROJECT_ROOT, 'agents', session.agent_slug, 'training-log.md');
  appendTrainingLog(logPath, {
    sessionId,
    scenario: session.scenario_focus,
    overallScore,
    scores: parsed.scores,
    summary: parsed.summary,
    keyLessons: parsed.keyLessons,
    transcript,
  });

  // 7. Mark completed
  await supabase
    .from('agent_training_sessions')
    .update({
      status: 'completed',
      opus_score: overallScore,
    })
    .eq('id', sessionId);

  console.log(`[Training/Reviewer] Session ${sessionId} reviewed: overall ${overallScore}/100`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Prompt construction
// ─────────────────────────────────────────────────────────────────────────────

function buildReviewerPrompt(agentSlug: string, scenario: string, transcript: string): string {
  const rubricList = RUBRIC.map((r, i) => `${i + 1}. ${r.key} — ${r.label}`).join('\n');

  return [
    '# Vai trò: Reviewer Opus 4.6 chấm điểm training session',
    '',
    `Bạn là reviewer cấp cao, chấm điểm training session của agent ${agentSlug}.`,
    `Scenario focus: ${scenario}`,
    '',
    '# Rubric — chấm 10 tiêu chí, mỗi tiêu chí 0-100 điểm:',
    '',
    rubricList,
    '',
    '# Transcript hội thoại training:',
    '',
    transcript,
    '',
    '# Yêu cầu output:',
    '',
    'Output STRICTLY JSON theo schema sau (không có markdown wrapper, không text trước/sau):',
    '',
    '```json',
    '{',
    '  "scores": [',
    '    {"key": "language_correctness", "score": 85, "feedback": "Câu 3 thiếu dấu cuối, ..."},',
    '    {"key": "tone_alignment", "score": 90, "feedback": "..."},',
    '    {"key": "hallucination_free", "score": 70, "feedback": "Turn 4 bịa giá khóa T1..."},',
    '    {"key": "marker_compliance", "score": 100, "feedback": "..."},',
    '    {"key": "factual_accuracy", "score": 80, "feedback": "..."},',
    '    {"key": "empathy", "score": 75, "feedback": "..."},',
    '    {"key": "actionability", "score": 85, "feedback": "..."},',
    '    {"key": "brand_voice_jennie", "score": 80, "feedback": "..."},',
    '    {"key": "escalation_correctness", "score": 95, "feedback": "..."},',
    '    {"key": "conciseness", "score": 70, "feedback": "Reply turn 6 dài 8 câu, nên 2-4..."}',
    '  ],',
    '  "summary": "Đánh giá tổng quan 2-3 câu — agent làm tốt phần nào, yếu phần nào",',
    '  "key_lessons": [',
    '    "Lesson 1 — concrete actionable feedback agent có thể dùng cho lần sau",',
    '    "Lesson 2 — ...",',
    '    "Lesson 3 — ..."',
    '  ]',
    '}',
    '```',
    '',
    'Lưu ý:',
    '- Score 0-100. Mặc định ~75. Excellent ≥ 90. Cần cải thiện ≤ 60.',
    '- Feedback PHẢI tiếng Việt có dấu, ngắn gọn, cụ thể (refer turn cụ thể).',
    '- key_lessons phải là rule có thể áp dụng cho reply tiếp theo, KHÔNG chung chung.',
  ].join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Claude CLI subprocess
// ─────────────────────────────────────────────────────────────────────────────

async function spawnClaudeCli(prompt: string, model: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = [
      '--print', '-',
      '--output-format', 'stream-json',
      '--verbose',
      '--dangerously-skip-permissions',
      '--model', model,
      '--max-turns', '1', // reviewer only needs single response
    ];

    // spawnHidden — claude is .exe so spawns directly with windowsHide.
    const child = spawnHidden('claude', args, {
      cwd: PROJECT_ROOT,
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('Claude CLI (Opus reviewer) timed out after 180s'));
    }, 180_000);

    child.stdin.write(prompt);
    child.stdin.end();

    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString('utf-8'); });
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString('utf-8'); });

    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0 && !stdout.trim()) {
        reject(new Error(`Claude CLI exit ${code}: ${stderr.substring(0, 300)}`));
        return;
      }
      // Parse stream-json: extract `result` field
      let reply = '';
      try {
        const lines = stdout.trim().split('\n');
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.result) {
              reply = typeof parsed.result === 'string'
                ? parsed.result
                : Array.isArray(parsed.result)
                  ? parsed.result.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n')
                  : String(parsed.result);
            }
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) reply += parsed.delta.text;
          } catch { /* skip non-JSON */ }
        }
        if (!reply) reply = stdout.trim();
      } catch {
        reply = stdout.trim();
      }
      resolve(reply);
    });

    child.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Output parsing
// ─────────────────────────────────────────────────────────────────────────────

interface ParsedReview {
  scores: Array<{ key: string; score: number; feedback: string }>;
  summary: string;
  keyLessons: string[];
}

function parseReviewerOutput(output: string): ParsedReview {
  const empty: ParsedReview = { scores: [], summary: '', keyLessons: [] };
  if (!output) return empty;

  // Try to extract JSON block (with or without ```json fence)
  let jsonText = output.trim();
  const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) jsonText = fenceMatch[1].trim();
  // Find first { ... } block
  const braceStart = jsonText.indexOf('{');
  const braceEnd = jsonText.lastIndexOf('}');
  if (braceStart === -1 || braceEnd === -1) return empty;
  jsonText = jsonText.slice(braceStart, braceEnd + 1);

  try {
    const parsed = JSON.parse(jsonText);
    return {
      scores: Array.isArray(parsed.scores)
        ? parsed.scores.map((s: any) => ({
            key: String(s.key || ''),
            score: Number(s.score) || 0,
            feedback: String(s.feedback || ''),
          })).filter((s: any) => RUBRIC.some((r) => r.key === s.key))
        : [],
      summary: String(parsed.summary || ''),
      keyLessons: Array.isArray(parsed.key_lessons) ? parsed.key_lessons.map((k: any) => String(k)) : [],
    };
  } catch (err: any) {
    console.warn(`[Training/Reviewer] JSON parse failed: ${err.message}`);
    return empty;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// training-log.md append
// ─────────────────────────────────────────────────────────────────────────────

interface LogEntry {
  sessionId: string;
  scenario: string;
  overallScore: number;
  scores: Array<{ key: string; score: number; feedback: string }>;
  summary: string;
  keyLessons: string[];
  transcript: string;
}

function appendTrainingLog(logPath: string, entry: LogEntry): void {
  try {
    const dir = dirname(logPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    if (!existsSync(logPath)) {
      writeFileSync(
        logPath,
        [
          '# Training Log',
          '',
          'Append-only log của các training session do CEO + Opus reviewer chấm.',
          'File này được auto-inject vào system prompt của agent (last 30 entries)',
          'để in-context learning — mỗi feedback mới sẽ ảnh hưởng reply tiếp theo.',
          '',
          '---',
          '',
        ].join('\n'),
        'utf-8',
      );
    }

    const ts = new Date().toISOString();
    const scoreList = entry.scores
      .map((s) => `  - **${s.key}**: ${s.score}/100 — ${s.feedback}`)
      .join('\n');

    const lessonList = entry.keyLessons.length > 0
      ? entry.keyLessons.map((l, i) => `${i + 1}. ${l}`).join('\n')
      : '(không có lesson cụ thể)';

    const block = [
      `## ${ts} — Session ${entry.sessionId.slice(0, 8)}`,
      '',
      `**Scenario**: ${entry.scenario}`,
      `**Overall score**: ${entry.overallScore}/100`,
      '',
      '### Rubric scores',
      scoreList || '(không có scores)',
      '',
      '### Tổng quan',
      entry.summary || '(không có summary)',
      '',
      '### Key lessons (RULES TO APPLY)',
      lessonList,
      '',
      '---',
      '',
    ].join('\n');

    appendFileSync(logPath, block, 'utf-8');
  } catch (err: any) {
    console.warn(`[Training/Reviewer] Failed to append training-log.md: ${err.message}`);
  }
}
