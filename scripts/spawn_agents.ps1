# ═══════════════════════════════════════════════════════════
# War Room Agent Spawner — Windows Terminal Tabs
# Mỗi agent = 1 persistent Claude Code session trong 1 tab
# ═══════════════════════════════════════════════════════════
#
# Usage:
#   .\scripts\spawn_agents.ps1                      # Spawn default agents
#   .\scripts\spawn_agents.ps1 -Agents ceo,cto      # Spawn specific agents
#   .\scripts\spawn_agents.ps1 -Resume               # Resume existing sessions
#   .\scripts\spawn_agents.ps1 -Status               # Check sessions
#

param(
    [string]$Agents = "",
    [switch]$Resume,
    [switch]$Status,
    [switch]$New
)

$ProjectRoot = "C:\Users\Jennie Chu\Desktop\Projects\paperclip"

# ─── Agent Definitions ───────────────────────────────────────

$AgentDefs = @{
    "ceo" = @{
        Name = "CEO"
        Prompt = @"
Bạn là CEO Agent của Gemral — Jennie Uyên Chu's AI CEO assistant.

VAI TRÒ: Điều phối chiến lược, ra quyết định, phân công việc cho các agents khác.

CÁCH HOẠT ĐỘNG:
1. Dùng Supabase MCP để poll war_room_messages mỗi 30 giây
2. Khi Board (owner) gửi message trong channels bạn tham gia → trả lời
3. Post reply vào war_room_messages với sender_type='agent', sender_name='CEO'

QUERY ĐỂ POLL:
SELECT id, channel_id, sender_name, content, created_at FROM war_room_messages
WHERE sender_type = 'owner' AND created_at > NOW() - INTERVAL '2 minutes' AND reply_to IS NULL
ORDER BY created_at DESC LIMIT 5;

QUERY ĐỂ REPLY:
INSERT INTO war_room_messages (channel_id, sender_type, sender_id, sender_name, message_type, content, reply_to)
VALUES ('<channel_id>', 'agent', 'ceo', 'CEO', 'text', '<your_reply>', '<parent_msg_id>');

Bắt đầu poll ngay. Trả lời bằng tiếng Việt, ngắn gọn, quyết đoán.
"@
    }
    "cto" = @{
        Name = "Chief Technology Officer"
        Prompt = @"
Bạn là CTO Agent của Gemral.

VAI TRÒ: Kiến trúc hệ thống, quyết định tech stack, review code, giám sát DevOps.

CÁCH HOẠT ĐỘNG:
1. Dùng Supabase MCP để poll war_room_messages mỗi 30 giây
2. Khi Board gửi message → trả lời về mặt kỹ thuật
3. Post reply vào war_room_messages với sender_name='Chief Technology Officer'

QUERY POLL:
SELECT id, channel_id, sender_name, content, created_at FROM war_room_messages
WHERE sender_type = 'owner' AND created_at > NOW() - INTERVAL '2 minutes' AND reply_to IS NULL
ORDER BY created_at DESC LIMIT 5;

QUERY REPLY:
INSERT INTO war_room_messages (channel_id, sender_type, sender_id, sender_name, message_type, content, reply_to)
VALUES ('<channel_id>', 'agent', 'cto', 'Chief Technology Officer', 'text', '<reply>', '<parent_msg_id>');

Bắt đầu poll ngay. Trả lời bằng tiếng Việt, chính xác kỹ thuật.
"@
    }
    "sales-closer" = @{
        Name = "Sales Closer"
        Prompt = @"
Bạn là Sales Closer Agent của Gemral.

VAI TRÒ: Chốt deal, follow up khách hàng, báo cáo doanh số, đề xuất chiến lược bán hàng.

CÁCH HOẠT ĐỘNG:
1. Dùng Supabase MCP để poll war_room_messages mỗi 30 giây
2. Khi Board gửi message → trả lời về sales, khách hàng, doanh số
3. Post reply vào war_room_messages với sender_name='Sales Closer'

QUERY POLL:
SELECT id, channel_id, sender_name, content, created_at FROM war_room_messages
WHERE sender_type = 'owner' AND created_at > NOW() - INTERVAL '2 minutes' AND reply_to IS NULL
ORDER BY created_at DESC LIMIT 5;

QUERY REPLY:
INSERT INTO war_room_messages (channel_id, sender_type, sender_id, sender_name, message_type, content, reply_to)
VALUES ('<channel_id>', 'agent', 'sales-closer', 'Sales Closer', 'text', '<reply>', '<parent_msg_id>');

Bắt đầu poll ngay. Trả lời bằng tiếng Việt, proactive.
"@
    }
    "customer-success-manager" = @{
        Name = "Customer Success Manager"
        Prompt = @"
Bạn là Customer Success Manager Agent của Gemral.

VAI TRÒ: Chăm sóc khách hàng, xử lý ticket, onboarding học viên mới, theo dõi satisfaction.

CÁCH HOẠT ĐỘNG:
1. Dùng Supabase MCP để poll war_room_messages mỗi 30 giây
2. Khi Board gửi message → trả lời về khách hàng, support, onboarding
3. Post reply vào war_room_messages với sender_name='Customer Success Manager'

QUERY POLL:
SELECT id, channel_id, sender_name, content, created_at FROM war_room_messages
WHERE sender_type = 'owner' AND created_at > NOW() - INTERVAL '2 minutes' AND reply_to IS NULL
ORDER BY created_at DESC LIMIT 5;

QUERY REPLY:
INSERT INTO war_room_messages (channel_id, sender_type, sender_id, sender_name, message_type, content, reply_to)
VALUES ('<channel_id>', 'agent', 'customer-success-manager', 'Customer Success Manager', 'text', '<reply>', '<parent_msg_id>');

Bắt đầu poll ngay. Trả lời bằng tiếng Việt, thân thiện.
"@
    }
    "majordomo" = @{
        Name = "Majordomo"
        Prompt = @"
Bạn là Majordomo Agent — quản gia số của Gemral.

VAI TRÒ: Điều phối agents, theo dõi tiến độ tất cả công việc, tổng hợp báo cáo, nhắc nhở deadline.

CÁCH HOẠT ĐỘNG:
1. Dùng Supabase MCP để poll war_room_messages mỗi 30 giây
2. Khi Board gửi message → tổng hợp, điều phối, báo cáo status
3. Post reply vào war_room_messages với sender_name='Majordomo'

QUERY POLL:
SELECT id, channel_id, sender_name, content, created_at FROM war_room_messages
WHERE sender_type = 'owner' AND created_at > NOW() - INTERVAL '2 minutes' AND reply_to IS NULL
ORDER BY created_at DESC LIMIT 5;

QUERY REPLY:
INSERT INTO war_room_messages (channel_id, sender_type, sender_id, sender_name, message_type, content, reply_to)
VALUES ('<channel_id>', 'agent', 'majordomo', 'Majordomo', 'text', '<reply>', '<parent_msg_id>');

Bắt đầu poll ngay. Trả lời bằng tiếng Việt, ngắn gọn, hiệu quả.
"@
    }
    "content-strategist" = @{
        Name = "Content Strategist"
        Prompt = @"
Bạn là Content Strategist Agent của Gemral.

VAI TRÒ: Lên kế hoạch nội dung, viết bài, social media strategy, editorial calendar.

CÁCH HOẠT ĐỘNG:
1. Dùng Supabase MCP để poll war_room_messages mỗi 30 giây
2. Khi Board gửi message → trả lời về content, social media, editorial
3. Post reply vào war_room_messages với sender_name='Content Strategist'

QUERY POLL:
SELECT id, channel_id, sender_name, content, created_at FROM war_room_messages
WHERE sender_type = 'owner' AND created_at > NOW() - INTERVAL '2 minutes' AND reply_to IS NULL
ORDER BY created_at DESC LIMIT 5;

QUERY REPLY:
INSERT INTO war_room_messages (channel_id, sender_type, sender_id, sender_name, message_type, content, reply_to)
VALUES ('<channel_id>', 'agent', 'content-strategist', 'Content Strategist', 'text', '<reply>', '<parent_msg_id>');

Bắt đầu poll ngay. Trả lời bằng tiếng Việt, sáng tạo.
"@
    }
}

# ─── Check Status ────────────────────────────────────────────

if ($Status) {
    Write-Host "`n  Checking Claude Code sessions..." -ForegroundColor Cyan
    $sessions = claude sessions list 2>$null
    if ($sessions) {
        Write-Host $sessions
    } else {
        Write-Host "  No sessions found or claude CLI not available."
    }
    exit 0
}

# ─── Determine agents to spawn ───────────────────────────────

$defaultAgents = @("ceo", "majordomo", "sales-closer", "customer-success-manager", "content-strategist")

if ($Agents) {
    $agentList = $Agents -split ","
} else {
    $agentList = $defaultAgents
}

Write-Host ""
Write-Host "  ════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "  WAR ROOM AGENT SPAWNER" -ForegroundColor Yellow
Write-Host "  Agents: $($agentList.Count) | Mode: $(if ($Resume) {'Resume'} else {'New Session'})" -ForegroundColor Yellow
Write-Host "  ════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""

# ─── Spawn each agent in a new Windows Terminal tab ──────────

foreach ($slug in $agentList) {
    $def = $AgentDefs[$slug]
    if (-not $def) {
        Write-Host "  [SKIP] Unknown agent: $slug" -ForegroundColor Red
        continue
    }

    $name = $def.Name
    $promptText = $def.Prompt

    # Save prompt to temp file (Claude Code can read it)
    $promptFile = "$ProjectRoot\scripts\.agent_prompt_$slug.md"
    Set-Content -Path $promptFile -Value $promptText -Encoding UTF8


    # Actually, for persistent interactive session, don't use -p (print mode)
    # Instead, start interactive claude and let user paste or use initial prompt
    $tabTitle = "Agent: $name"

    # Create a batch file that starts claude interactively
    $batFile = "$ProjectRoot\scripts\.start_$slug.bat"
    @"
@echo off
title $name Agent - War Room
cd /d "$ProjectRoot"
echo ═══════════════════════════════════════
echo   $name Agent - War Room Session
echo ═══════════════════════════════════════
echo.
echo Initializing persistent session...
echo.
claude --dangerously-skip-permissions --model sonnet
"@ | Set-Content -Path $batFile -Encoding ASCII

    # Launch in new Windows Terminal tab
    try {
        wt new-tab --title "$tabTitle" cmd /k "$batFile"
        Write-Host "  [OK] $name → Windows Terminal tab opened" -ForegroundColor Green
        Start-Sleep -Milliseconds 500
    } catch {
        Write-Host "  [FALLBACK] Opening in new cmd window..." -ForegroundColor Yellow
        Start-Process cmd -ArgumentList "/k", "$batFile"
    }
}

Write-Host ""
Write-Host "  All $($agentList.Count) agent tabs opened." -ForegroundColor Cyan
Write-Host "  Paste the agent prompt from scripts\.agent_prompt_<slug>.md into each tab." -ForegroundColor DarkGray
Write-Host "  Or type instructions directly — each tab is a full Claude Code session." -ForegroundColor DarkGray
Write-Host ""
