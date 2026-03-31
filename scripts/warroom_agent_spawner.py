#!/usr/bin/env python3
"""
War Room Agent Spawner — Persistent Session Manager
═══════════════════════════════════════════════════════
Polls war_room_messages for Board messages, dispatches to agents via Claude CLI.
Each agent runs as a subprocess with its own context/persona.

Usage:
  python scripts/warroom_agent_spawner.py                    # Start all agents
  python scripts/warroom_agent_spawner.py --agents ceo,cto   # Start specific agents
  python scripts/warroom_agent_spawner.py --list              # List available agents
  python scripts/warroom_agent_spawner.py --status            # Check running sessions
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
import threading
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone
from typing import Optional

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

# ─── Config ──────────────────────────────────────────────────

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Load .env from project root
env_path = os.path.join(PROJECT_ROOT, ".env")
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

SUPABASE_URL = os.environ.get("GEMRAL_SUPABASE_URL", os.environ.get("SUPABASE_URL", "https://pgfkbcnzqozzkohwbgbk.supabase.co"))
SUPABASE_KEY = os.environ.get("GEMRAL_SUPABASE_SERVICE_KEY", os.environ.get("SUPABASE_SERVICE_ROLE_KEY", os.environ.get("SUPABASE_ANON_KEY", "")))

POLL_INTERVAL = 8  # seconds between polls
MAX_RESPONSE_TIME = 120  # seconds timeout for Claude CLI

# ─── Agent Personas ──────────────────────────────────────────

AGENT_PERSONAS = {
    "ceo": {
        "name": "CEO",
        "system": "Bạn là CEO Agent của Gemral. Vai trò: điều phối chiến lược, ra quyết định, phân công việc. Trả lời ngắn gọn, quyết đoán, bằng tiếng Việt.",
    },
    "cto": {
        "name": "Chief Technology Officer",
        "system": "Bạn là CTO Agent của Gemral. Vai trò: kiến trúc hệ thống, quyết định tech stack, review code. Trả lời kỹ thuật, chính xác, bằng tiếng Việt.",
    },
    "lead-researcher": {
        "name": "Lead Researcher",
        "system": "Bạn là Lead Researcher Agent. Vai trò: nghiên cứu thị trường, phân tích data, tổng hợp insight. Trả lời có dẫn chứng, bằng tiếng Việt.",
    },
    "content-strategist": {
        "name": "Content Strategist",
        "system": "Bạn là Content Strategist Agent. Vai trò: lên kế hoạch nội dung, viết bài, social media strategy. Trả lời sáng tạo, bằng tiếng Việt.",
    },
    "sales-closer": {
        "name": "Sales Closer",
        "system": "Bạn là Sales Closer Agent. Vai trò: chốt deal, follow up khách hàng, báo cáo doanh số. Trả lời proactive, bằng tiếng Việt.",
    },
    "customer-success-manager": {
        "name": "Customer Success Manager",
        "system": "Bạn là Customer Success Manager Agent. Vai trò: chăm sóc khách hàng, xử lý ticket, onboarding. Trả lời thân thiện, bằng tiếng Việt.",
    },
    "designer": {
        "name": "Designer",
        "system": "Bạn là Designer Agent. Vai trò: thiết kế UI/UX, tạo visual, brand identity. Trả lời về design, bằng tiếng Việt.",
    },
    "social-media-manager": {
        "name": "Social Media Manager",
        "system": "Bạn là Social Media Manager Agent. Vai trò: quản lý Facebook/TikTok/YouTube, lên lịch đăng bài, phân tích engagement. Trả lời bằng tiếng Việt.",
    },
    "email-crm-manager": {
        "name": "Email & CRM Manager",
        "system": "Bạn là Email & CRM Manager Agent. Vai trò: email marketing, automation sequences, CRM management. Trả lời bằng tiếng Việt.",
    },
    "devops-engineer": {
        "name": "DevOps Engineer",
        "system": "Bạn là DevOps Engineer Agent. Vai trò: CI/CD, server management, monitoring, deployment. Trả lời kỹ thuật, bằng tiếng Việt.",
    },
    "majordomo": {
        "name": "Majordomo",
        "system": "Bạn là Majordomo Agent — quản gia số. Vai trò: điều phối agents, theo dõi tiến độ, tổng hợp báo cáo. Trả lời ngắn gọn, bằng tiếng Việt.",
    },
    "agents-orchestrator": {
        "name": "Agents Orchestrator",
        "system": "Bạn là Agents Orchestrator. Vai trò: điều phối tất cả agents, phân công task, monitor health. Trả lời bằng tiếng Việt.",
    },
    "financial-controller": {
        "name": "Financial Controller",
        "system": "Bạn là Financial Controller Agent. Vai trò: quản lý tài chính, budget, báo cáo chi phí. Trả lời chính xác về số liệu, bằng tiếng Việt.",
    },
    "head-of-growth": {
        "name": "Head of Growth",
        "system": "Bạn là Head of Growth Agent. Vai trò: growth hacking, acquisition, retention strategy. Trả lời data-driven, bằng tiếng Việt.",
    },
}

# ─── Supabase helpers ────────────────────────────────────────

def supabase_request(path: str, method: str = "GET", body: dict = None) -> dict:
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read())
    except Exception as e:
        print(f"  [ERROR] Supabase: {e}")
        return []


def get_agent_channels(agent_slug: str) -> list[str]:
    """Get channel IDs this agent is a member of."""
    data = supabase_request(
        f"war_room_members?agent_slug=eq.{agent_slug}&select=channel_id"
    )
    return [r["channel_id"] for r in data] if data else []


def get_new_messages(channel_ids: list[str], since: str, agent_slug: str) -> list[dict]:
    """Get messages from Board (owner) in agent's channels since timestamp."""
    if not channel_ids:
        return []
    channel_filter = ",".join(channel_ids)
    # Get messages from owner (Board) that are newer than last check, not replies
    data = supabase_request(
        f"war_room_messages?channel_id=in.({channel_filter})"
        f"&sender_type=eq.owner"
        f"&created_at=gt.{since}"
        f"&reply_to=is.null"
        f"&order=created_at.asc"
        f"&select=id,channel_id,sender_name,content,created_at,message_type"
    )
    return data if data else []


def get_channel_name(channel_id: str) -> str:
    data = supabase_request(f"war_room_channels?id=eq.{channel_id}&select=name")
    return data[0]["name"] if data else "unknown"


def post_reply(channel_id: str, agent_slug: str, agent_name: str, content: str, reply_to: str = None):
    """Post agent reply to war room."""
    body = {
        "channel_id": channel_id,
        "sender_type": "agent",
        "sender_id": agent_slug,
        "sender_name": agent_name,
        "message_type": "text",
        "content": content,
        "reply_to": reply_to,
        "is_pinned": False,
    }
    supabase_request("war_room_messages", method="POST", body=body)


def register_session(agent_slug: str, pid: int):
    """Register agent session in DB."""
    # Upsert
    body = {
        "agent_slug": agent_slug,
        "session_id": f"warroom-{agent_slug}-{int(time.time())}",
        "status": "running",
        "terminal_type": "windows-terminal",
        "pid": pid,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "last_activity_at": datetime.now(timezone.utc).isoformat(),
    }
    # Delete old then insert (simpler than upsert with urllib)
    supabase_request(
        f"agent_sessions?agent_slug=eq.{agent_slug}", method="DELETE"
    )
    supabase_request("agent_sessions", method="POST", body=body)


def update_heartbeat(agent_slug: str):
    supabase_request(
        f"agent_sessions?agent_slug=eq.{agent_slug}",
        method="PATCH",
        body={"last_activity_at": datetime.now(timezone.utc).isoformat(), "last_poll_at": datetime.now(timezone.utc).isoformat()},
    )


def set_session_stopped(agent_slug: str):
    supabase_request(
        f"agent_sessions?agent_slug=eq.{agent_slug}",
        method="PATCH",
        body={"status": "stopped"},
    )


# ─── Claude CLI invocation ───────────────────────────────────

def invoke_claude(system_prompt: str, user_message: str, model: str = "sonnet") -> Optional[str]:
    """Call Claude CLI for agent response."""
    claude_bin = shutil.which("claude")
    if not claude_bin:
        return None

    prompt = f"{system_prompt}\n\n---\nTin nhắn từ Board:\n{user_message}\n\nTrả lời ngắn gọn (1-3 câu), đúng vai trò của bạn."

    try:
        env = {k: v for k, v in os.environ.items() if k != "CLAUDECODE"}
        proc = subprocess.run(
            [claude_bin, "--print", "--dangerously-skip-permissions", "--model", model, "--max-turns", "3"],
            input=prompt,
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=MAX_RESPONSE_TIME,
            cwd=PROJECT_ROOT,
            env=env,
        )
        if proc.returncode == 0 and proc.stdout.strip():
            return proc.stdout.strip()
        return None
    except subprocess.TimeoutExpired:
        return None
    except Exception as e:
        print(f"  [ERROR] Claude CLI: {e}")
        return None


# ─── Agent Worker ────────────────────────────────────────────

class AgentWorker:
    def __init__(self, slug: str, persona: dict):
        self.slug = slug
        self.name = persona["name"]
        self.system_prompt = persona["system"]
        self.channels = []
        self.last_check = datetime.now(timezone.utc).isoformat()
        self.running = True
        self.processed_ids = set()

    def start(self):
        self.channels = get_agent_channels(self.slug)
        if not self.channels:
            print(f"  [{self.name}] Không có channels nào → skip")
            return

        register_session(self.slug, os.getpid())
        channel_names = [get_channel_name(c) for c in self.channels[:3]]
        print(f"  [{self.name}] Online — {len(self.channels)} channels: {', '.join(channel_names)}...")

        # Post online message to general
        general_channels = [c for c in self.channels]
        if general_channels:
            post_reply(
                general_channels[0], self.slug, self.name,
                f"Dạ em {self.name} đã online. Sẵn sàng nhận việc ạ."
            )

        while self.running:
            try:
                self.poll()
                update_heartbeat(self.slug)
            except Exception as e:
                print(f"  [{self.name}] Poll error: {e}")
            time.sleep(POLL_INTERVAL)

    def poll(self):
        messages = get_new_messages(self.channels, self.last_check, self.slug)
        for msg in messages:
            if msg["id"] in self.processed_ids:
                continue
            self.processed_ids.add(msg["id"])
            self.handle_message(msg)

        if messages:
            self.last_check = messages[-1]["created_at"]

    def handle_message(self, msg: dict):
        channel_name = get_channel_name(msg["channel_id"])
        content = msg["content"]
        sender = msg["sender_name"]

        print(f"  [{self.name}] #{channel_name} ← {sender}: {content[:60]}...")

        # Generate response via Claude CLI
        context = f"[Channel: #{channel_name}] {sender} nói: {content}"
        response = invoke_claude(self.system_prompt, context)

        if response:
            # Trim to reasonable length
            if len(response) > 500:
                response = response[:497] + "..."
            post_reply(msg["channel_id"], self.slug, self.name, response, reply_to=msg["id"])
            print(f"  [{self.name}] → Replied ({len(response)} chars)")
        else:
            post_reply(
                msg["channel_id"], self.slug, self.name,
                f"Dạ em {self.name} đã nhận. Em đang xử lý ạ.",
                reply_to=msg["id"],
            )
            print(f"  [{self.name}] → Fallback ack")

    def stop(self):
        self.running = False
        set_session_stopped(self.slug)
        print(f"  [{self.name}] Stopped")


# ─── Main ────────────────────────────────────────────────────

def list_agents():
    print("\n  Available agents:")
    print("  " + "─" * 40)
    for slug, persona in sorted(AGENT_PERSONAS.items()):
        print(f"  {slug:<30} {persona['name']}")
    print(f"\n  Total: {len(AGENT_PERSONAS)} agents\n")


def check_status():
    data = supabase_request("agent_sessions?select=agent_slug,status,last_activity_at,terminal_type&order=agent_slug.asc")
    if not data:
        print("\n  No active sessions.\n")
        return
    print("\n  Agent Sessions:")
    print("  " + "─" * 60)
    for s in data:
        print(f"  {s['agent_slug']:<30} {s['status']:<10} {s.get('last_activity_at', '—')[:19]}")
    print()


def main():
    parser = argparse.ArgumentParser(description="War Room Agent Spawner")
    parser.add_argument("--agents", type=str, help="Comma-separated agent slugs to spawn")
    parser.add_argument("--list", action="store_true", help="List available agents")
    parser.add_argument("--status", action="store_true", help="Check running sessions")
    parser.add_argument("--model", type=str, default="sonnet", help="Claude model (default: sonnet)")
    args = parser.parse_args()

    if args.list:
        list_agents()
        return

    if args.status:
        check_status()
        return

    if not SUPABASE_KEY:
        print("[ERROR] SUPABASE_KEY not set. Check .env file.")
        sys.exit(1)

    # Determine which agents to spawn
    if args.agents:
        slugs = [s.strip() for s in args.agents.split(",")]
    else:
        # Default: spawn core agents
        slugs = ["ceo", "majordomo", "sales-closer", "customer-success-manager", "content-strategist"]

    global MAX_RESPONSE_TIME
    if args.model == "opus":
        MAX_RESPONSE_TIME = 180

    print(f"\n{'═' * 50}")
    print(f"  WAR ROOM AGENT SPAWNER")
    print(f"  Agents: {len(slugs)} | Model: {args.model} | Poll: {POLL_INTERVAL}s")
    print(f"{'═' * 50}\n")

    workers = []
    threads = []

    for slug in slugs:
        persona = AGENT_PERSONAS.get(slug)
        if not persona:
            print(f"  [WARN] Unknown agent: {slug} → skipped")
            continue

        worker = AgentWorker(slug, persona)
        workers.append(worker)
        t = threading.Thread(target=worker.start, daemon=True, name=f"agent-{slug}")
        threads.append(t)
        t.start()
        time.sleep(0.5)  # Stagger starts

    if not workers:
        print("  No agents to spawn.")
        return

    print(f"\n  All {len(workers)} agents online. Press Ctrl+C to stop.\n")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n  Shutting down agents...")
        for w in workers:
            w.stop()
        time.sleep(2)
        print("  Done.\n")


if __name__ == "__main__":
    main()
