#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
parse-sop-steps.py
Parse TAT CA SOP .md files tu memory/sops/ -> extract steps that (Workflow Steps table)
+ knowledge_files + data_schema + scripts + body_markdown -> upsert vao gem_sops via REST API

Usage:
  python parse-sop-steps.py [--dry-run] [--sop-id SAL-001] [--limit 10]
"""

import os, sys, re, json, argparse
import urllib.request, urllib.error
from pathlib import Path

# Fix Windows encoding
if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if sys.stderr.encoding.lower() != 'utf-8':
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')


# ─── Config ────────────────────────────────────────────────────────────────
SOPS_DIR = Path(r"C:\Users\Jennie Chu\Desktop\Projects\crypto-pattern-scanner\memory\sops")
API_BASE = "http://localhost:3101/api/ops/sop-engine"

# Đọc từ env hoặc hardcode (local dev only)
SUPABASE_URL = os.environ.get("GEMRAL_SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("GEMRAL_SUPABASE_SERVICE_KEY", "")

# ─── Parser helpers ────────────────────────────────────────────────────────

def parse_table_rows(text: str, section_start: str, section_end: str = None) -> list[dict]:
    """Extract markdown table rows between two section markers."""
    pattern = re.escape(section_start) + r'.*?\n(.*?)(?=' + (re.escape(section_end) if section_end else r'\n##') + r')'
    match = re.search(pattern, text, re.DOTALL)
    if not match:
        return []
    table_text = match.group(0)
    rows = []
    in_header = True
    headers = []
    for line in table_text.split('\n'):
        line = line.strip()
        if not line.startswith('|'):
            continue
        cells = [c.strip() for c in line.split('|') if c.strip()]
        if not cells:
            continue
        if set(c.replace('-', '') for c in cells) == {''}:  # separator row
            in_header = False
            continue
        if in_header and not headers:
            headers = [h.lower().replace(' ', '_').replace('#', 'order') for h in cells]
            in_header = False
            continue
        if cells and len(cells) >= 2:
            row = dict(zip(headers, cells))
            rows.append(row)
    return rows


def parse_workflow_steps(content: str) -> list[dict]:
    """Parse '## Workflow Steps' table → StepDefinition objects."""
    steps = []
    
    # Find Workflow Steps section
    match = re.search(r'## Workflow Steps\s*\n(.*?)(?=\n## |\Z)', content, re.DOTALL)
    if not match:
        return steps
    
    section = match.group(1)
    
    # Parse table rows
    in_header = True
    header = []
    for line in section.split('\n'):
        line = line.strip()
        if not line.startswith('|'):
            continue
        cells = [c.strip() for c in line.split('|') if c.strip()]
        if not cells:
            continue
        if all(re.match(r'^-+$', c.replace(' ', '')) for c in cells):
            in_header = False
            continue
        if in_header and not header:
            header = cells
            in_header = False
            continue
        if len(cells) >= 4 and header:
            row = dict(zip(header, cells))
            try:
                order_raw = row.get('#', row.get('order', '1'))
                order = int(re.sub(r'\D', '', str(order_raw))) if order_raw else len(steps) + 1
            except:
                order = len(steps) + 1
            
            step_name = row.get('Tên bước', row.get('tên_bước', row.get('Bước', f'Bước {order}')))
            step_type_raw = row.get('Loại', row.get('loại', 'manual')).lower()
            
            # Normalize type
            type_map = {
                'agent': 'agent', 'auto': 'agent',
                'manual': 'manual', '—': 'manual', '-': 'manual',
                'script': 'script', 'bash': 'script',
                'api': 'api', 'webhook': 'api',
                'approval': 'approval', 'duyệt': 'approval',
                'event': 'event', 'trigger': 'event',
            }
            step_type = type_map.get(step_type_raw, 'manual')
            
            executor = row.get('Executor', row.get('executor', '')).strip()
            if executor in ('—', '-', ''):
                executor = 'auto' if step_type == 'agent' else 'human'
            
            agent = row.get('Agent', row.get('agent', '')).strip()
            input_src = row.get('Input', row.get('input', '')).strip()
            output_dst = row.get('Output', row.get('output', '')).strip()
            on_success = row.get('On Success', row.get('on_success', 'next')).strip().lower()
            on_failure = row.get('On Fail', row.get('on_fail', row.get('on_failure', 'retry'))).strip().lower()
            
            # Normalize on_success/on_failure
            on_success = on_success if on_success else 'next'
            on_failure = on_failure if on_failure else 'retry'
            if on_success in ('end', 'hoàn tất', 'xong'):
                on_success = 'end'
            
            step = {
                'order': order,
                'name': step_name,
                'type': step_type,
                'executor': executor,
                'agent': agent if agent and agent not in ('—', '-') else None,
                'input': {'source': input_src} if input_src else {'source': ''},
                'output': {'destination': output_dst} if output_dst else {'destination': ''},
                'on_success': on_success,
                'on_failure': on_failure,
                'estimated_minutes': 15 if step_type == 'manual' else 5,
            }
            steps.append(step)
    
    # Thêm instructions từ ### Bước N sections
    step_details = extract_step_details(content)
    for i, step in enumerate(steps):
        detail_key = i + 1
        if detail_key in step_details:
            step['instructions'] = step_details[detail_key]
    
    return steps


def extract_step_details(content: str) -> dict[int, str]:
    """Extract '### Bước N: ...' sections as instructions per step."""
    details = {}
    # Find all ### Bước N sections
    pattern = r'### Bước (\d+):?\s*(.*?)\n(.*?)(?=\n### Bước \d|$)'
    for m in re.finditer(pattern, content, re.DOTALL):
        step_num = int(m.group(1))
        step_title = m.group(2).strip()
        step_body = m.group(3).strip()
        # Limit to 2000 chars
        instructions = f"**{step_title}**\n\n{step_body}"[:2000] if step_body else step_title
        details[step_num] = instructions
    return details


def parse_knowledge_files(content: str) -> list[str]:
    """Parse '## Knowledge Files' section → list of file names."""
    kf = []
    match = re.search(r'## Knowledge Files.*?\n(.*?)(?=\n## |\Z)', content, re.DOTALL)
    if not match:
        return kf
    section = match.group(1)
    for line in section.split('\n'):
        line = line.strip()
        if not line.startswith('|'):
            continue
        cells = [c.strip() for c in line.split('|') if c.strip()]
        if len(cells) >= 1 and not all(c.startswith('-') for c in cells):
            fname = cells[0].strip()
            if fname and fname not in ('File', 'file', '---') and not fname.startswith('-'):
                # Only add actual file names
                if '.' in fname or fname.endswith('.md'):
                    kf.append(fname)
    return kf


def parse_data_schema(content: str) -> list[dict]:
    """Parse '## Data Schema' section → list of table schema objects."""
    schemas = []
    match = re.search(r'## Data Schema\s*\n(.*?)(?=\n## |\Z)', content, re.DOTALL)
    if not match:
        return schemas
    section = match.group(1)
    in_header = True
    header = []
    for line in section.split('\n'):
        line = line.strip()
        if not line.startswith('|'):
            continue
        cells = [c.strip() for c in line.split('|') if c.strip()]
        if not cells:
            continue
        if all(re.match(r'^-+$', c.replace(' ', '')) for c in cells):
            in_header = False
            continue
        if in_header and not header:
            header = [h.lower().strip() for h in cells]
            in_header = False
            continue
        if len(cells) >= 2:
            row = dict(zip(header, cells))
            table_name = row.get('table', cells[0] if cells else '').strip()
            columns = row.get('columns', cells[1] if len(cells) > 1 else '').strip()
            rw = row.get('read/write', 'READ').strip()
            purpose = row.get('mục_đích', row.get('mục đích', '')).strip()
            if table_name and not table_name.startswith('-'):
                schemas.append({
                    'table': table_name,
                    'columns': [c.strip() for c in columns.split(',') if c.strip()],
                    'access': rw,
                    'purpose': purpose,
                })
    return schemas


def parse_cron(content: str) -> str | None:
    """Extract cron expression if present in triggers."""
    # Look for schedule/cron patterns
    cron_patterns = [
        r'cron:\s*`?([0-9\*/\s,-]+[0-9\*])`?',
        r'schedule:\s*`?([0-9\*/\s,-]+[0-9\*])`?',
        r'`([0-9\*/]{1,5}\s+[0-9\*/]{1,5}\s+[0-9\*/]{1,5}\s+[0-9\*/]{1,5}\s+[0-9\*/]{1,5})`',
    ]
    for pat in cron_patterns:
        m = re.search(pat, content, re.IGNORECASE)
        if m:
            return m.group(1).strip()
    
    # Look for frequency keywords → convert to cron
    if re.search(r'hàng ngày.{0,20}06:00|daily.{0,20}6am', content, re.IGNORECASE):
        return '0 6 * * *'
    if re.search(r'hàng ngày.{0,20}08:00|daily.{0,20}8am', content, re.IGNORECASE):
        return '0 8 * * *'
    if re.search(r'mỗi 15 phút|every 15 min', content, re.IGNORECASE):
        return '*/15 * * * *'
    if re.search(r'thứ 2.{0,20}06:00|monday.{0,20}6am', content, re.IGNORECASE):
        return '0 6 * * 1'
    if re.search(r'chủ nhật.{0,20}20:00|sunday.{0,20}8pm', content, re.IGNORECASE):
        return '0 20 * * 0'
    if re.search(r'2 tuần.{0,20}1 lần|biweekly', content, re.IGNORECASE):
        return '0 8 1,15 * *'
    return None


def extract_scripts(content: str) -> list[str]:
    """Extract code blocks from SOP that look like runnable scripts."""
    scripts = []
    # Find all code blocks
    for m in re.finditer(r'```(\w*)\n(.*?)```', content, re.DOTALL):
        lang = m.group(1).lower()
        code = m.group(2).strip()
        # Only include bash/python/sql/typescript code blocks
        if lang in ('bash', 'python', 'sql', 'ts', 'typescript', 'sh') and len(code) > 20:
            scripts.append(f"# [{lang}]\n{code}")
    return scripts


def parse_sop_file(filepath: Path) -> dict | None:
    """Parse một SOP file → dict với tất cả fields."""
    try:
        content = filepath.read_text(encoding='utf-8', errors='replace')
    except Exception as e:
        print(f"  ⚠️ Không đọc được {filepath.name}: {e}")
        return None
    
    # Extract Meta table
    meta = {}
    meta_match = re.search(r'## Meta\s*\n(.*?)(?=\n## |\Z)', content, re.DOTALL)
    if meta_match:
        for line in meta_match.group(1).split('\n'):
            cells = [c.strip() for c in line.split('|') if c.strip()]
            if len(cells) >= 2 and not cells[0].startswith('-') and cells[0] != 'Field':
                key = cells[0].lower().replace(' ', '_')
                val = cells[1]
                meta[key] = val
    
    sop_id = meta.get('sop_id', filepath.stem.upper())
    
    # Parse all sections
    steps = parse_workflow_steps(content)
    knowledge_files = parse_knowledge_files(content)
    data_schema = parse_data_schema(content)
    cron = parse_cron(content)
    scripts = extract_scripts(content)
    
    # Body: full content (trim to 8000 chars for DB)
    body = content[:8000]
    
    return {
        'sop_id': sop_id,
        'steps': steps,
        'knowledge_files': knowledge_files,
        'data_schema': data_schema,
        'cron': cron,
        'scripts': scripts,
        'body_markdown': body,
        'file_path': str(filepath),
        'meta': meta,
    }


# ─── API caller ────────────────────────────────────────────────────────────

def api_put(sop_id: str, payload: dict, dry_run: bool = False) -> bool:
    """PUT /api/ops/sop-engine/sops/:sopId"""
    url = f"{API_BASE}/sops/{sop_id}"
    
    if dry_run:
        print(f"  [DRY-RUN] PUT {url}")
        print(f"    steps: {len(payload.get('steps', []))} steps")
        print(f"    knowledge_files: {payload.get('knowledge_files', [])[:3]}")
        if payload.get('cron'):
            print(f"    cron: {payload['cron']}")
        return True
        
    extra_cols = {'cron', 'data_schema', 'scripts', 'file_path', 'trigger_events'}
    
    for attempt in range(2):
        if attempt == 1:
            # Strip extra
            payload = {k: v for k, v in payload.items() if k not in extra_cols}
            
        data = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        try:
            req = urllib.request.Request(
                url,
                data=data,
                method='PUT',
                headers={'Content-Type': 'application/json', 'Accept': 'application/json'},
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                result = json.loads(resp.read())
                return True
        except urllib.error.HTTPError as e:
            body = e.read().decode('utf-8', errors='replace')[:200]
            if e.code == 500 and attempt == 0 and ('Could not find the' in body or 'schema cache' in body):
                # Try without extra columns
                continue
            if e.code == 500 and attempt == 0 and ('domain' in body or 'status' in body):
                # We added domain to bypass not-null, maybe it broke another thing? So just fail hard
                print(f"  ❌ Required column missing in DB: {body}")
                return False
                
            print(f"  ❌ HTTP {e.code} [Attempt {attempt}]: {body}")
            return False
        except Exception as e:
            print(f"  ❌ Error: {e}")
            return False
            
    return False


# ─── Main ──────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='Parse SOP files → seed steps to DB')
    parser.add_argument('--dry-run', action='store_true', help='Print only, no API calls')
    parser.add_argument('--sop-id', help='Process only this SOP ID (e.g. CS-001)')
    parser.add_argument('--limit', type=int, default=200, help='Max SOPs to process')
    parser.add_argument('--domain', help='Filter by domain prefix (e.g. SAL, CS, CNT)')
    args = parser.parse_args()
    
    print(f"\n{'='*60}")
    print(f"SOP Steps Parser — GEM Ecosystem")
    print(f"Source: {SOPS_DIR}")
    print(f"Target: {API_BASE}")
    print(f"Mode: {'DRY-RUN' if args.dry_run else 'LIVE'}")
    print(f"{'='*60}\n")
    
    # Collect files
    sop_files = sorted(SOPS_DIR.glob('*.md'))
    
    # Filter: only domain SOP files (pattern: XX-NNN.md)
    domain_pattern = re.compile(r'^([A-Z]{2,4})-(\d{3})\.md$')
    sop_files = [f for f in sop_files if domain_pattern.match(f.name)]
    
    if args.sop_id:
        sop_files = [f for f in sop_files if f.stem.upper() == args.sop_id.upper()]
    elif args.domain:
        sop_files = [f for f in sop_files if f.name.startswith(args.domain.upper() + '-')]
    
    sop_files = sop_files[:args.limit]
    
    print(f"📂 Tìm thấy {len(sop_files)} SOP files để process\n")
    
    stats = {'total': 0, 'success': 0, 'no_steps': 0, 'error': 0}
    
    for filepath in sop_files:
        stats['total'] += 1
        sop_id = filepath.stem.upper()
        print(f"[{stats['total']:3d}/{len(sop_files)}] {sop_id}", end='  ')
        
        parsed = parse_sop_file(filepath)
        if not parsed:
            stats['error'] += 1
            continue
        
        steps = parsed['steps']
        if not steps:
            print(f"-- 0 steps (no Workflow Steps table)")
            stats['no_steps'] += 1
            # Still update body_markdown and knowledge_files for all SOPs
            domain = sop_id.split('-')[0] if '-' in sop_id else 'OPS'
            name = parsed['meta'].get('ten', parsed['meta'].get('t\xean', sop_id))
            payload = {
                'domain': domain,
                'name': name if name != sop_id else f'{sop_id} SOP',
                'sop_type': parsed['meta'].get('lo\u1ea1i', 'standard'),
                'knowledge_files': parsed['knowledge_files'],
                'body_markdown': parsed['body_markdown'],
                'status': parsed['meta'].get('status', 'published'),
                'priority': parsed['meta'].get('priority', 'P2').lower(),
            }
            if parsed['data_schema']:
                payload['data_schema'] = parsed['data_schema']
            if parsed['cron']:
                payload['cron'] = parsed['cron']
            ok = api_put(sop_id, payload, dry_run=args.dry_run)
            if ok:
                stats['success'] += 1
            continue
        
        print(f"OK {len(steps)} steps | {len(parsed['knowledge_files'])} KF | schema:{len(parsed['data_schema'])} | cron:{parsed['cron'] or '-'}")
        
        # Build payload for PUT — include domain/name to avoid NOT NULL constraint
        domain = sop_id.split('-')[0] if '-' in sop_id else 'OPS'
        name = parsed['meta'].get('t\xean', parsed['meta'].get('ten', sop_id))
        payload = {
            'domain': domain,
            'name': name if name and name != sop_id else f'{sop_id} SOP',
            'sop_type': parsed['meta'].get('lo\u1ea1i', 'workflow'),
            'status': parsed['meta'].get('status', 'published'),
            'priority': parsed['meta'].get('priority', 'P2').lower(),
            'steps': steps,
            'knowledge_files': parsed['knowledge_files'],
            'body_markdown': parsed['body_markdown'],
        }
        if parsed['data_schema']:
            payload['data_schema'] = parsed['data_schema']
        if parsed['cron']:
            payload['cron'] = parsed['cron']
        if parsed['scripts']:
            payload['scripts'] = parsed['scripts']
        
        ok = api_put(sop_id, payload, dry_run=args.dry_run)
        if ok:
            stats['success'] += 1
        else:
            stats['error'] += 1
    
    print(f"\n{'='*60}")
    print(f"[DONE] {stats['success']}/{stats['total']} updated successfully")
    print(f"[WARN] {stats['no_steps']} SOPs have no Workflow Steps table")
    print(f"[ERR ] {stats['error']} errors")
    print(f"{'='*60}\n")


if __name__ == '__main__':
    main()
