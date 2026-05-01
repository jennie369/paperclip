import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../server/.env');
const envContent = fs.readFileSync(envPath, 'utf8');

let supabaseUrl = '';
let supabaseKey = '';

for (const line of envContent.split('\n')) {
  if (line.startsWith('VITE_SUPABASE_URL=') || line.startsWith('SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim().replace(/['"]/g, '');
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=') || line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim().replace(/['"]/g, '');
}

console.log('Got SUPABASE_URL:', supabaseUrl);

const scheduledSteps = [
  {
    "name": "Sinh bulk content 2 tuần",
    "type": "script",
    "agent": null,
    "hooks": [
      "write_log:cnt-notion-001-batch"
    ],
    "input": {
      "source": "cron",
      "tables": []
    },
    "order": 1,
    "config": {
      "cwd": ".",
      "command": "PYTHONUTF8=1 python scripts/batch_processor.py batch --days=14 --accounts=all",
      "timeout": 1800000
    },
    "output": {
      "tables": [
        "cc_scripts"
      ],
      "destination": "supabase"
    },
    "script": "PYTHONUTF8=1 python scripts/batch_processor.py batch --days=14 --accounts=all",
    "trigger": {
      "type": "cron",
      "schedule": "0 6 * * 1"
    },
    "instructions": "Sinh bulk content 2 tuần. INSERT vào cc_scripts status=draft. USE-CASE FIRST rule tự động inject.",
    "preconditions": []
  },
  {
    "name": "Push cc_scripts → Notion CONTENT PLANNER 2026",
    "type": "script",
    "agent": null,
    "hooks": [
      "write_log:cnt-notion-001-push"
    ],
    "input": {
      "source": "step:1",
      "tables": [
        "cc_scripts"
      ]
    },
    "order": 2,
    "config": {
      "cwd": ".",
      "command": "PYTHONUTF8=1 python scripts/notion_migrate_cc_to_content_planner.py --since=\"7 days ago\"",
      "timeout": 300000
    },
    "output": {
      "tables": [],
      "destination": "external"
    },
    "script": "PYTHONUTF8=1 python scripts/notion_migrate_cc_to_content_planner.py --since=\"7 days ago\"",
    "trigger": {
      "type": "db_trigger",
      "schedule": ""
    },
    "instructions": "Idempotent migrate. Set Social Channel relation theo channel_target. Lưu notion_page_id về cc_scripts.",
    "preconditions": [
      "step:1 done"
    ]
  },
  {
    "name": "Jennie review + edit trong Notion",
    "type": "approval",
    "agent": null,
    "hooks": [
      "notify:telegram:jennie"
    ],
    "input": {
      "source": "step:2",
      "tables": []
    },
    "order": 3,
    "config": {
      "instructions": "Mở Notion → CONTENT PLANNER 2026 → view This Week Draft. Edit caption/hashtag/hình. Thỏa mãn → đổi Status=Approved. Webhook tự fire trong <60 giây."
    },
    "output": {
      "tables": [],
      "destination": "external"
    },
    "trigger": {
      "type": "manual",
      "schedule": ""
    },
    "instructions": "Review + approve từng post.",
    "preconditions": [
      "step:2 done"
    ]
  },
  {
    "name": "Notion webhook → Edge Function sync",
    "type": "webhook",
    "agent": null,
    "hooks": [
      "write_log:cnt-notion-001-webhook"
    ],
    "input": {
      "source": "step:3",
      "tables": [
        "notion_webhook_tokens"
      ]
    },
    "order": 4,
    "config": {
      "event": "page.properties_updated",
      "timeout": 30000,
      "endpoint": "/functions/v1/notion-content-sync"
    },
    "output": {
      "tables": [
        "cc_scripts"
      ],
      "destination": "supabase"
    },
    "trigger": {
      "type": "webhook",
      "schedule": ""
    },
    "instructions": "Verify signature, lookup cc_scripts.id qua notion_page_id, UPDATE status=approved + final_content.",
    "preconditions": [
      "step:3 done"
    ]
  },
  {
    "name": "Playwright scheduler đăng bài",
    "type": "script",
    "agent": null,
    "hooks": [
      "write_log:cnt-notion-001-schedule",
      "notify:telegram:jennie"
    ],
    "input": {
      "source": "step:4",
      "tables": [
        "cc_scripts"
      ]
    },
    "order": 5,
    "config": {
      "cwd": ".",
      "command": "PYTHONUTF8=1 python scripts/schedule_meta_business_suite.py --approved-only",
      "timeout": 600000
    },
    "output": {
      "tables": [],
      "destination": "external"
    },
    "script": "PYTHONUTF8=1 python scripts/schedule_meta_business_suite.py --approved-only",
    "trigger": {
      "type": "cron",
      "schedule": "*/5 * * * *"
    },
    "instructions": "Cron mỗi 5 phút. SELECT approved AND scheduled_at<=NOW(). Upload hình theo combo rule. Schedule qua Meta BS/TikTok/Forum.",
    "preconditions": [
      "step:4 done"
    ]
  },
  {
    "name": "Update cc_scripts sau khi đăng",
    "type": "script",
    "agent": null,
    "hooks": [
      "write_log:cnt-notion-001-mark-published"
    ],
    "input": {
      "source": "step:5",
      "tables": [
        "cc_scripts"
      ]
    },
    "order": 6,
    "config": {
      "cwd": ".",
      "command": "(inline in step 5)",
      "timeout": 60000
    },
    "output": {
      "tables": [
        "cc_scripts"
      ],
      "destination": "supabase"
    },
    "trigger": {
      "type": "automatic",
      "schedule": ""
    },
    "instructions": "UPDATE status=published, post_url, published_at.",
    "preconditions": [
      "step:5 done"
    ]
  },
  {
    "name": "Push-back Notion (Status=Published + Post URL)",
    "type": "script",
    "agent": null,
    "hooks": [
      "write_log:cnt-notion-001-pushback"
    ],
    "input": {
      "source": "step:6",
      "tables": [
        "cc_scripts"
      ]
    },
    "order": 7,
    "config": {
      "cwd": ".",
      "command": "curl -X POST https://pgfkbcnzqozzkohwbgbk.supabase.co/functions/v1/notion-content-sync ...",
      "timeout": 60000
    },
    "output": {
      "tables": [],
      "destination": "external"
    },
    "trigger": {
      "type": "automatic",
      "schedule": ""
    },
    "instructions": "PUT Notion page.update: Status=Published, Post URL, Published At. Rate limit 3 req/s.",
    "preconditions": [
      "step:6 done"
    ]
  }
];

const immediateSteps = [
      {
        order: 1,
        name: 'Đồng bộ Notion Webhook',
        type: 'webhook',
        trigger: { type: 'webhook', event: 'page.properties_updated' },
        input: { source: 'notion', tables: ['notion_webhook_tokens'] },
        output: { destination: 'supabase', tables: ['cc_scripts'] },
        instructions: 'Notion đổi Status=Approved + Publish Mode=immediate. Webhook sync về cc_scripts.',
      },
      {
        order: 2,
        name: 'DB Trigger → cc_publish_queue',
        type: 'event',
        trigger: { type: 'db_trigger', event: 'trg_cc_scripts_immediate_publish' },
        input: { source: 'step:1', tables: ['cc_scripts'] },
        output: { destination: 'supabase', tables: ['cc_publish_queue'] },
        instructions: 'Trigger tự động insert queue với trigger_type=\'immediate\'',
      },
      {
        order: 3,
        name: 'Realtime Fast-path / Poll Queue',
        type: 'script',
        trigger: { type: 'automatic' },
        input: { source: 'step:2', tables: ['cc_publish_queue'] },
        script: 'node scripts/poll_publish_queue.py',
        instructions: 'Server nhận Realtime event hoặc cron Gemral_PublishQueue chạy.',
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
      },
      {
        order: 5,
        name: 'Push-back Notion (Status=Published)',
        type: 'script',
        trigger: { type: 'automatic' },
         input: { source: 'step:4', tables: ['cc_scripts'] },
         output: { destination: 'external' },
         instructions: 'Đồng bộ ngược Status=Published và Post URL về Notion.'
      }
];

const thresholdSteps = [
      {
        order: 1,
        name: 'Wait for 5 Approved Posts',
        type: 'event',
        trigger: { type: 'db_trigger', event: 'trg_cc_scripts_threshold_publish' },
        input: { source: 'cc_scripts', tables: ['cc_scripts'] },
        output: { destination: 'supabase', tables: ['cc_publish_queue'] },
        instructions: 'Trigger đếm nếu count(approved, threshold_5, same account) >= 5 → enqueue all 5 to cc_publish_queue.',
      },
      {
        order: 2,
        name: 'Realtime Fast-path / Poll Queue',
        type: 'script',
        trigger: { type: 'automatic' },
        input: { source: 'step:1', tables: ['cc_publish_queue'] },
        script: 'node scripts/poll_publish_queue.py',
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
];

const endpoints = [
  {
    sop_id: 'CNT-NOTION-001',
    payload: {
      sop_id: 'CNT-NOTION-001',
      name: 'CNT-NOTION-001 · Tạo Content Qua Notion Review Flow (V3.1)',
      description: 'Quy trình sinh content batch → đẩy sang Notion → Jennie review → Sync về DB → Playwright auto-publish theo lịch (Scheduled Mode).',
      domain: 'content',
      priority: 'p0',
      status: 'published',
      assigned_agents: ['content-creator', 'content-reviewer'],
      content_type_key: 'social_post',
      output_format: 'markdown',
      steps: scheduledSteps
    }
  },
  {
    sop_id: 'CNT-NOTION-IMMEDIATE',
    payload: {
      sop_id: 'CNT-NOTION-IMMEDIATE',
      name: 'CNT-NOTION Immediate · Publish Now (V3.2)',
      description: 'Bỏ qua lịch đăng, bài viết Publish Mode=immediate sau khi Approved sẽ push ngay vào queue và đăng tức thì.',
      domain: 'content',
      priority: 'p0',
      status: 'published',
      assigned_agents: ['content-creator'],
      content_type_key: 'social_post',
      output_format: 'markdown',
      steps: immediateSteps
    }
  },
  {
    sop_id: 'CNT-NOTION-THRESHOLD',
    payload: {
      sop_id: 'CNT-NOTION-THRESHOLD',
      name: 'CNT-NOTION Threshold · Bulk Batch (V3.2)',
      description: 'Chờ đủ 5 bài cùng account có Publish Mode=threshold_5 được Approved thì gom đăng tuần tự.',
      domain: 'content',
      priority: 'p1',
      status: 'published',
      assigned_agents: ['content-creator'],
      content_type_key: 'social_post',
      output_format: 'markdown',
      steps: thresholdSteps
    }
  }
];

async function update() {
  for (const { sop_id, payload } of endpoints) {
      console.log('Sending request to upsert', sop_id);
      try {
        const response = await fetch(`https://pgfkbcnzqozzkohwbgbk.supabase.co/rest/v1/gem_sops?on_conflict=sop_id`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
           const err = await response.text();
           console.error('Failed for', sop_id, err);
        } else {
           console.log('Successfully upserted', sop_id);
        }
      } catch (e) {
          console.error('Exception for', sop_id, e);
      }
  }
}

update();
