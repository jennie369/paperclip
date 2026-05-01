import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deploy() {
  const { data: existingBase } = await supabase
    .from('gem_sops')
    .select('*')
    .eq('sop_id', 'CNT-NOTION-001')
    .single();

  const baseSop = existingBase || {};
  const baseSteps = baseSop.steps || [];

  // Update CNT-NOTION-001 (Scheduled)
  const scheduledSop = {
    ...baseSop,
    name: 'CNT-NOTION-001 · Tạo Content Qua Notion Review Flow (V3.1)',
    description: 'Quy trình sinh content batch → đẩy sang Notion → Jennie review → Sync về DB → Playwright auto-publish theo lịch (Scheduled Mode).',
  };

  // Immediate Workflow
  const immediateSop = {
    sop_id: 'CNT-NOTION-IMMEDIATE',
    name: 'CNT-NOTION Immediate · Publish Now (V3.2)',
    description: 'Bỏ qua lịch đăng, bài viết Publish Mode=immediate sau khi Approved sẽ push ngay vào queue và đăng tức thì.',
    domain: baseSop.domain || 'content',
    priority: 'p0',
    status: 'published',
    assigned_agents: baseSop.assigned_agents || ['content-creator'],
    content_type_key: 'social_post',
    output_format: 'markdown',
    knowledge_files: baseSop.knowledge_files || [],
    steps: [
      {
        order: 1,
        name: 'Đồng bộ Notion Webhook',
        type: 'webhook',
        trigger: { type: 'webhook', event: 'page.properties_updated' },
        input: { source: 'notion_webhook_tokens' },
        output: { destination: 'supabase', tables: ['cc_scripts'] },
        instructions: 'Notion đổi Status=Approved + Publish Mode=immediate. Webhook sync về cc_scripts.',
        config: { endpoint: '/functions/v1/notion-content-sync' }
      },
      {
        order: 2,
        name: 'DB Trigger → cc_publish_queue',
        type: 'event',
        trigger: { type: 'db_trigger', event: 'trg_cc_scripts_immediate_publish' },
        input: { source: 'step:1', tables: ['cc_publish_queue'] },
        output: { destination: 'supabase', tables: ['cc_publish_queue'] },
        instructions: 'Trigger tự động insert queue với trigger_type=\'immediate\'',
      },
      {
        order: 3,
        name: 'Realtime Fast-path / Poll Queue',
        type: 'script',
        trigger: { type: 'automatic' },
        input: { source: 'step:2', tables: ['cc_publish_queue'] },
        script: 'POST /api/ops/content-pipeline/publish-queue',
        instructions: 'Server nhận Realtime event hoặc cron Gemral_PublishQueue chạy.',
        config: { command: 'node scripts/poll_publish_queue.py' }
      },
      {
        order: 4,
        name: 'Playwright Publish Single',
        type: 'script',
        trigger: { type: 'automatic' },
        input: { source: 'step:3', tables: ['cc_scripts'] },
        script: 'PYTHONUTF8=1 python scripts/schedule_meta_business_suite.py --single <id>',
        output: { destination: 'external' },
        hooks: ['write_log:cnt-notion-immediate-publish', 'notify:telegram:jennie'],
        instructions: 'Đăng ngay bài bằng Playwright theo ID cụ thể',
        config: { timeout: 300000 }
      },
      {
        order: 5,
        name: 'Push-back Notion (Status=Published)',
        type: 'script',
        trigger: { type: 'automatic' },
         input: { source: 'step:4', tables: ['cc_scripts'] },
         output: { destination: 'external' },
         config: {
           command: 'curl -X POST https://pgfkbcnzqozzkohwbgbk.supabase.co/functions/v1/notion-content-sync ...',
         },
         instructions: 'Đồng bộ ngược Status=Published và Post URL về Notion.'
      }
    ]
  };

  // Threshold Workflow
  const thresholdSop = {
    sop_id: 'CNT-NOTION-THRESHOLD',
    name: 'CNT-NOTION Threshold · Bulk Batch (V3.2)',
    description: 'Chờ đủ 5 bài cùng account có Publish Mode=threshold_5 được Approved thì gom đăng tuần tự (thay vì scheduled rải rác).',
    domain: baseSop.domain || 'content',
    priority: 'p1',
    status: 'published',
    assigned_agents: baseSop.assigned_agents || ['content-creator'],
    content_type_key: 'social_post',
    output_format: 'markdown',
    knowledge_files: baseSop.knowledge_files || [],
    steps: [
      {
        order: 1,
        name: 'Wait for 5 Approved Posts',
        type: 'event',
        trigger: { type: 'db_trigger', event: 'trg_cc_scripts_threshold_publish' },
        input: { source: 'cc_scripts', tables: ['cc_scripts'] },
        output: { destination: 'supabase', tables: ['cc_publish_queue'] },
        instructions: 'Trigger đếm nếu count(approved, threshold_5, same account) >= 5 → enqueue all 5 to cc_publish_queue (type=threshold).',
      },
      {
        order: 2,
        name: 'Realtime Fast-path / Poll Queue',
        type: 'script',
        trigger: { type: 'automatic' },
        input: { source: 'step:1', tables: ['cc_publish_queue'] },
        script: 'POST /api/ops/content-pipeline/publish-queue',
        instructions: 'Server nhận Realtime event hoặc cron Gemral_PublishQueue chạy.',
      },
      {
        order: 3,
        name: 'Playwright Publish Batch',
        type: 'script',
        trigger: { type: 'automatic' },
        input: { source: 'step:2', tables: ['cc_scripts'] },
        script: 'PYTHONUTF8=1 python scripts/schedule_meta_business_suite.py --batch-approved --channel <account>',
        output: { destination: 'external' },
        hooks: ['write_log:cnt-notion-threshold-batch', 'notify:telegram:jennie'],
        instructions: 'Chạy vòng lặp publish các queue item, spread 3 phút mỗi bài',
        config: { timeout: 1200000 }
      },
      {
        order: 4,
         name: 'Push-back Notion (Status=Published)',
         type: 'script',
         trigger: { type: 'automatic' },
          input: { source: 'step:3', tables: ['cc_scripts'] },
          output: { destination: 'external' },
          instructions: 'Đồng bộ ngược Status=Published và Post URL về Notion cho tất cả 5 bài (hoặc bulk request).'
      }
    ]
  };

  const { error: err1 } = await supabase.from('gem_sops').upsert([scheduledSop, immediateSop, thresholdSop], { onConflict: 'sop_id' });
  if (err1) {
    console.error('Error upserting sops:', err1);
  } else {
    console.log('Successfully upserted 3 SOPs');
  }

}

deploy();
