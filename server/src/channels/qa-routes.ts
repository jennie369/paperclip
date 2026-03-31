// QA Evaluation System — API Routes
// Provides endpoints for evaluating agent conversations quality.

import { Router } from 'express';
import { supabase } from './zalo-personal/supabase.js';

const router = Router();

// ─── Criteria CRUD ───

/**
 * GET /api/channels/qa/criteria
 * List all QA evaluation criteria.
 */
router.get('/criteria', async (_req, res) => {
  const { data, error } = await supabase
    .from('qa_evaluation_criteria')
    .select('*')
    .order('category')
    .order('name');

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

/**
 * POST /api/channels/qa/criteria
 * Create new criterion.
 */
router.post('/criteria', async (req, res) => {
  const { name, display_name, description, category, weight, pass_threshold, enabled } = req.body;

  const { data, error } = await supabase
    .from('qa_evaluation_criteria')
    .insert({
      name,
      display_name,
      description,
      category,
      weight: weight || 1.0,
      pass_threshold: pass_threshold || null,
      enabled: enabled !== false,
    })
    .select('*')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/**
 * PATCH /api/channels/qa/criteria/:id
 * Update criterion.
 */
router.patch('/criteria/:id', async (req, res) => {
  const { id } = req.params;
  const updates: Record<string, any> = {};
  for (const key of ['name', 'display_name', 'description', 'category', 'weight', 'pass_threshold', 'enabled']) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const { data, error } = await supabase
    .from('qa_evaluation_criteria')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ─── Evaluations ───

/**
 * GET /api/channels/qa/evaluations
 * List evaluations. Query: ?agent_slug=xxx&verdict=pass|fail&limit=50&offset=0
 */
router.get('/evaluations', async (req, res) => {
  const { agent_slug, verdict, limit = 50, offset = 0 } = req.query;

  let query = supabase
    .from('qa_evaluations')
    .select('*')
    .order('evaluated_at', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (agent_slug) query = query.eq('agent_slug', String(agent_slug));
  if (verdict) query = query.eq('verdict', String(verdict));

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

/**
 * GET /api/channels/qa/evaluations/:id
 * Get single evaluation with full details.
 */
router.get('/evaluations/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('qa_evaluations')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Không tìm thấy đánh giá' });
  res.json(data);
});

/**
 * POST /api/channels/qa/evaluate
 * Evaluate a conversation session.
 * Body: { session_key } — evaluates the conversation using AI.
 */
router.post('/evaluate', async (req, res) => {
  const { session_key } = req.body;
  if (!session_key) return res.status(400).json({ error: 'session_key bắt buộc' });

  // Load session + history
  const { data: session } = await supabase
    .from('channel_sessions')
    .select('*')
    .eq('session_key', session_key)
    .single();

  if (!session) return res.status(404).json({ error: 'Session không tìm thấy' });

  const history = (session.history || []) as Array<{ role: string; content: string; timestamp?: string }>;
  if (history.length < 2) return res.status(400).json({ error: 'Session không đủ tin nhắn để đánh giá' });

  // Load criteria
  const { data: criteria } = await supabase
    .from('qa_evaluation_criteria')
    .select('*')
    .eq('enabled', true);

  if (!criteria || criteria.length === 0) {
    return res.status(500).json({ error: 'Không có tiêu chí đánh giá nào' });
  }

  // Run rule-based evaluation (no AI call — fast + free)
  const evaluation = evaluateConversation(history, criteria, session);

  // Save to DB
  const { data: saved, error: saveErr } = await supabase
    .from('qa_evaluations')
    .insert({
      session_key,
      channel_name: session.channel_name,
      channel_type: 'zalo_personal',
      agent_slug: session.agent_slug,
      customer_id: session.sender_id,
      customer_name: session.sender_name,
      score: evaluation.score,
      verdict: evaluation.verdict,
      pass_threshold: 70,
      message_count: history.length,
      criteria_scores: evaluation.criteriaScores,
      violations: evaluation.violations,
      categories: evaluation.categories,
      sentiment: evaluation.sentiment,
      suggestions: evaluation.suggestions,
      summary: evaluation.summary,
      conversation_snapshot: history,
      evaluation_type: 'auto_rule',
      evaluated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (saveErr) return res.status(500).json({ error: saveErr.message });
  res.json(saved);
});

/**
 * POST /api/channels/qa/evaluate-batch
 * Evaluate multiple sessions at once.
 * Body: { session_keys: string[] } or { all_unreviewed: true, limit?: number }
 */
router.post('/evaluate-batch', async (req, res) => {
  let sessionKeys: string[] = req.body.session_keys || [];

  if (req.body.all_unreviewed) {
    // Find sessions not yet evaluated
    const limit = req.body.limit || 50;
    const { data: sessions } = await supabase
      .from('channel_sessions')
      .select('session_key')
      .order('last_message_at', { ascending: false })
      .limit(limit);

    if (sessions) {
      const allKeys = sessions.map((s: any) => s.session_key);
      // Filter out already evaluated
      const { data: evaluated } = await supabase
        .from('qa_evaluations')
        .select('session_key')
        .in('session_key', allKeys);

      const evaluatedSet = new Set((evaluated || []).map((e: any) => e.session_key));
      sessionKeys = allKeys.filter((k: string) => !evaluatedSet.has(k));
    }
  }

  if (sessionKeys.length === 0) {
    return res.json({ evaluated: 0, results: [] });
  }

  // Evaluate each (max 20 at a time)
  const toEvaluate = sessionKeys.slice(0, 20);
  const results: any[] = [];

  const { data: criteria } = await supabase
    .from('qa_evaluation_criteria')
    .select('*')
    .eq('enabled', true);

  if (!criteria || criteria.length === 0) {
    return res.status(500).json({ error: 'Không có tiêu chí đánh giá nào' });
  }

  for (const sk of toEvaluate) {
    const { data: session } = await supabase
      .from('channel_sessions')
      .select('*')
      .eq('session_key', sk)
      .single();

    if (!session) continue;
    const history = (session.history || []) as Array<{ role: string; content: string }>;
    if (history.length < 2) continue;

    const evaluation = evaluateConversation(history, criteria, session);

    const { data: saved } = await supabase
      .from('qa_evaluations')
      .insert({
        session_key: sk,
        channel_name: session.channel_name,
        channel_type: 'zalo_personal',
        agent_slug: session.agent_slug,
        customer_id: session.sender_id,
        customer_name: session.sender_name,
        score: evaluation.score,
        verdict: evaluation.verdict,
        pass_threshold: 70,
        message_count: history.length,
        criteria_scores: evaluation.criteriaScores,
        violations: evaluation.violations,
        categories: evaluation.categories,
        sentiment: evaluation.sentiment,
        suggestions: evaluation.suggestions,
        summary: evaluation.summary,
        conversation_snapshot: history,
        evaluation_type: 'auto_rule',
        evaluated_at: new Date().toISOString(),
      })
      .select('id, session_key, score, verdict')
      .single();

    if (saved) results.push(saved);
  }

  res.json({ evaluated: results.length, remaining: sessionKeys.length - toEvaluate.length, results });
});

// ─── Reports ───

/**
 * GET /api/channels/qa/reports
 * List QA reports. Query: ?report_type=daily|weekly&limit=10
 */
router.get('/reports', async (req, res) => {
  const { report_type, limit = 10 } = req.query;

  let query = supabase
    .from('qa_evaluation_reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(Number(limit));

  if (report_type) query = query.eq('report_type', String(report_type));

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

/**
 * POST /api/channels/qa/reports/generate
 * Generate a QA report for a period.
 * Body: { report_type: 'daily'|'weekly', period_start?, period_end? }
 */
router.post('/reports/generate', async (req, res) => {
  const reportType = req.body.report_type || 'daily';
  const now = new Date();
  const periodEnd = req.body.period_end ? new Date(req.body.period_end) : now;
  const periodStart = req.body.period_start
    ? new Date(req.body.period_start)
    : new Date(periodEnd.getTime() - (reportType === 'weekly' ? 7 : 1) * 86400_000);

  // Fetch evaluations in period
  const { data: evals } = await supabase
    .from('qa_evaluations')
    .select('*')
    .gte('evaluated_at', periodStart.toISOString())
    .lte('evaluated_at', periodEnd.toISOString());

  const evaluations = evals || [];
  if (evaluations.length === 0) {
    return res.status(400).json({ error: 'Không có đánh giá nào trong khoảng thời gian này' });
  }

  const passCount = evaluations.filter((e: any) => e.verdict === 'pass').length;
  const failCount = evaluations.filter((e: any) => e.verdict === 'fail').length;
  const avgScore = Math.round(evaluations.reduce((sum: number, e: any) => sum + (e.score || 0), 0) / evaluations.length);

  // Agent scores breakdown
  const agentMap = new Map<string, { scores: number[]; count: number }>();
  for (const e of evaluations as any[]) {
    const slug = e.agent_slug || 'unknown';
    if (!agentMap.has(slug)) agentMap.set(slug, { scores: [], count: 0 });
    const entry = agentMap.get(slug)!;
    entry.scores.push(e.score || 0);
    entry.count++;
  }
  const agentScores: Record<string, any> = {};
  for (const [slug, data] of agentMap) {
    agentScores[slug] = {
      avg_score: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
      count: data.count,
      pass_rate: Math.round(evaluations.filter((e: any) => e.agent_slug === slug && e.verdict === 'pass').length / data.count * 100),
    };
  }

  // Top violations
  const violationMap = new Map<string, number>();
  for (const e of evaluations as any[]) {
    for (const v of (e.violations || []) as any[]) {
      const name = v.criterion || v.name || 'unknown';
      violationMap.set(name, (violationMap.get(name) || 0) + 1);
    }
  }
  const topViolations = Array.from(violationMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // Count conversations in period
  const { count: totalConversations } = await supabase
    .from('channel_sessions')
    .select('id', { count: 'exact', head: true })
    .gte('last_message_at', periodStart.toISOString())
    .lte('last_message_at', periodEnd.toISOString());

  const { data: report, error: saveErr } = await supabase
    .from('qa_evaluation_reports')
    .insert({
      report_type: reportType,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      total_conversations: totalConversations || 0,
      total_evaluated: evaluations.length,
      avg_score: avgScore,
      pass_count: passCount,
      fail_count: failCount,
      pass_rate: Math.round(passCount / evaluations.length * 100),
      agent_scores: agentScores,
      top_violations: topViolations,
    })
    .select('*')
    .single();

  if (saveErr) return res.status(500).json({ error: saveErr.message });
  res.json(report);
});

// ─── Stats ───

/**
 * GET /api/channels/qa/stats
 * Quick QA stats overview.
 */
router.get('/stats', async (_req, res) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    { count: totalEvals },
    { count: todayEvals },
    { data: recentEvals },
  ] = await Promise.all([
    supabase.from('qa_evaluations').select('id', { count: 'exact', head: true }),
    supabase.from('qa_evaluations').select('id', { count: 'exact', head: true }).gte('evaluated_at', todayStart.toISOString()),
    supabase.from('qa_evaluations').select('score, verdict, agent_slug').order('evaluated_at', { ascending: false }).limit(100),
  ]);

  const evals = recentEvals || [];
  const avgScore = evals.length > 0
    ? Math.round(evals.reduce((s: number, e: any) => s + (e.score || 0), 0) / evals.length)
    : 0;
  const passRate = evals.length > 0
    ? Math.round(evals.filter((e: any) => e.verdict === 'pass').length / evals.length * 100)
    : 0;

  res.json({
    totalEvaluations: totalEvals || 0,
    todayEvaluations: todayEvals || 0,
    avgScore,
    passRate,
    recentCount: evals.length,
  });
});

export default router;

// ─── Rule-Based Evaluation Engine ───

interface EvalResult {
  score: number;
  verdict: 'pass' | 'fail';
  criteriaScores: Record<string, { score: number; maxScore: number; notes: string }>;
  violations: Array<{ criterion: string; description: string; severity: string }>;
  categories: string[];
  sentiment: string;
  suggestions: string[];
  summary: string;
}

function evaluateConversation(
  history: Array<{ role: string; content: string; timestamp?: string }>,
  criteria: any[],
  session: any,
): EvalResult {
  const criteriaScores: Record<string, { score: number; maxScore: number; notes: string }> = {};
  const violations: Array<{ criterion: string; description: string; severity: string }> = [];
  const suggestions: string[] = [];
  const categories: string[] = [];

  const userMsgs = history.filter(m => m.role === 'user');
  const agentMsgs = history.filter(m => m.role === 'assistant');

  let totalScore = 0;
  let totalWeight = 0;

  for (const c of criteria) {
    const maxScore = 10 * (c.weight || 1);
    totalWeight += c.weight || 1;
    let score = maxScore; // Start with perfect, deduct for violations
    let notes = 'Đạt';

    switch (c.name) {
      case 'greeting': {
        // Check if first agent message has a greeting
        const firstAgent = agentMsgs[0]?.content?.toLowerCase() || '';
        const hasGreeting = /xin chào|chào bạn|hello|hi |chào/.test(firstAgent);
        if (!hasGreeting) {
          score = maxScore * 0.3;
          notes = 'Thiếu lời chào đầu cuộc trò chuyện';
          violations.push({ criterion: c.display_name, description: notes, severity: 'minor' });
        }
        break;
      }

      case 'tone': {
        // Check for rude/curt responses
        const shortResponses = agentMsgs.filter(m => m.content.length < 15);
        if (shortResponses.length > agentMsgs.length / 2) {
          score = maxScore * 0.5;
          notes = 'Nhiều câu trả lời quá ngắn, có thể cộc lốc';
          violations.push({ criterion: c.display_name, description: notes, severity: 'moderate' });
        }
        break;
      }

      case 'empathy': {
        // Check if agent shows empathy when customer complains
        const complaints = userMsgs.filter(m => /không hài lòng|sao lại|tại sao|lỗi|bug|hỏng|chậm|kém/i.test(m.content));
        if (complaints.length > 0) {
          const empathyWords = agentMsgs.filter(m => /hiểu|thấu hiểu|xin lỗi|rất tiếc|chia sẻ|thông cảm/i.test(m.content));
          if (empathyWords.length === 0) {
            score = maxScore * 0.3;
            notes = 'Khách phàn nàn nhưng không thể hiện đồng cảm';
            violations.push({ criterion: c.display_name, description: notes, severity: 'major' });
            suggestions.push('Cần thêm lời đồng cảm khi khách phàn nàn');
          }
          categories.push('complaint');
        }
        break;
      }

      case 'accuracy': {
        // Check for hedging/uncertain language
        const uncertain = agentMsgs.filter(m => /không chắc|có lẽ|chắc là|hình như|tôi nghĩ/i.test(m.content));
        if (uncertain.length > 0) {
          score = maxScore * 0.6;
          notes = 'Có câu trả lời không chắc chắn';
          violations.push({ criterion: c.display_name, description: notes, severity: 'moderate' });
          suggestions.push('Agent cần nắm rõ kiến thức để trả lời chắc chắn hơn');
        }
        break;
      }

      case 'completeness': {
        // Check if questions are answered
        const questions = userMsgs.filter(m => m.content.includes('?') || /bao nhiêu|như thế nào|ở đâu|khi nào|tại sao|gì/i.test(m.content));
        if (questions.length > agentMsgs.length) {
          score = maxScore * 0.5;
          notes = 'Có câu hỏi chưa được trả lời';
          violations.push({ criterion: c.display_name, description: notes, severity: 'major' });
        }
        break;
      }

      case 'knowledge': {
        // Check for "I don't know" type responses
        const dontKnow = agentMsgs.filter(m => /không biết|chưa rõ|không có thông tin|tôi không/i.test(m.content));
        if (dontKnow.length > 0) {
          score = maxScore * 0.5;
          notes = 'Agent thiếu kiến thức trả lời';
          violations.push({ criterion: c.display_name, description: notes, severity: 'moderate' });
        }
        break;
      }

      case 'response_time': {
        // Can't accurately measure from saved history without timestamps
        // Give full score by default
        notes = 'Tự động (không đo được từ lịch sử)';
        break;
      }

      case 'resolution': {
        // Check if conversation ends positively
        const lastAgent = agentMsgs[agentMsgs.length - 1]?.content || '';
        const resolved = /đã xong|hoàn tất|giúp gì thêm|hỗ trợ thêm|chúc bạn/i.test(lastAgent);
        const lastUser = userMsgs[userMsgs.length - 1]?.content || '';
        const userHappy = /cảm ơn|ok|được rồi|tốt|hay/i.test(lastUser);
        if (!resolved && !userHappy) {
          score = maxScore * 0.6;
          notes = 'Cuộc trò chuyện chưa có kết thúc rõ ràng';
        }
        categories.push(resolved || userHappy ? 'resolved' : 'unresolved');
        break;
      }

      case 'follow_up': {
        // Check if agent asks follow-up questions
        const followUp = agentMsgs.filter(m => /thêm gì|giúp gì|cần gì|có gì|bạn cần/i.test(m.content));
        if (followUp.length === 0 && agentMsgs.length >= 2) {
          score = maxScore * 0.5;
          notes = 'Không hỏi thêm nhu cầu của khách';
          violations.push({ criterion: c.display_name, description: notes, severity: 'minor' });
        }
        break;
      }

      case 'closing': {
        const lastAgent = agentMsgs[agentMsgs.length - 1]?.content || '';
        const hasClosing = /cảm ơn|chúc bạn|hẹn gặp|chào bạn|tốt lành/i.test(lastAgent);
        if (!hasClosing) {
          score = maxScore * 0.5;
          notes = 'Thiếu lời kết thúc';
        }
        break;
      }
    }

    criteriaScores[c.name] = { score: Math.round(score * 10) / 10, maxScore, notes };
    totalScore += score;
  }

  // Normalize to 0-100
  const normalizedScore = totalWeight > 0 ? Math.round((totalScore / (totalWeight * 10)) * 100) : 0;

  // Detect sentiment from user messages
  const allUserText = userMsgs.map(m => m.content).join(' ').toLowerCase();
  let sentiment = 'neutral';
  if (/cảm ơn|tuyệt|tốt|hay|giỏi|ok|được/i.test(allUserText)) sentiment = 'positive';
  if (/không hài lòng|tệ|kém|chậm|lỗi|bực/i.test(allUserText)) sentiment = 'negative';

  const summary = `${session.agent_slug || 'Agent'} đã xử lý ${history.length} tin nhắn. Điểm: ${normalizedScore}/100 (${normalizedScore >= 70 ? 'Đạt' : 'Không đạt'}). ${violations.length > 0 ? `${violations.length} vi phạm.` : 'Không có vi phạm.'}`;

  return {
    score: normalizedScore,
    verdict: normalizedScore >= 70 ? 'pass' : 'fail',
    criteriaScores,
    violations,
    categories: [...new Set(categories)],
    sentiment,
    suggestions,
    summary,
  };
}
