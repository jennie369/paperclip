# HEARTBEAT.md -- CEO Heartbeat Checklist

Run this checklist on every heartbeat. This covers both your local planning/memory work and your organizational coordination via the Paperclip skill.

## 0. Identity & task context (NO API CALL — spawn-time inject)

<!-- spawn-context-rule:2026-04-29 -->

The Paperclip server injects your full identity + current task context as
env vars + a JSON manifest file at spawn time. **DO NOT** call
`GET /api/agents/me` or `GET /api/issues/{id}` just to learn "who am I, what
task am I on" — the answers are already in your environment.

**Env vars (read directly, no API needed):**

| Field | Env var |
|---|---|
| Agent UUID | `$PAPERCLIP_AGENT_ID` |
| Agent name / role / title | `$PAPERCLIP_AGENT_NAME`, `$PAPERCLIP_AGENT_ROLE`, `$PAPERCLIP_AGENT_TITLE` |
| Company UUID / prefix | `$PAPERCLIP_COMPANY_ID`, `$PAPERCLIP_COMPANY_PREFIX` |
| Issue UUID / shortId | `$PAPERCLIP_ISSUE_ID`, `$PAPERCLIP_ISSUE_IDENTIFIER` |
| Issue title / status / priority | `$PAPERCLIP_ISSUE_TITLE`, `$PAPERCLIP_ISSUE_STATUS`, `$PAPERCLIP_ISSUE_PRIORITY` |
| Issue description (≤4KB env, full in manifest) | `$PAPERCLIP_ISSUE_DESCRIPTION` (set `$PAPERCLIP_ISSUE_DESCRIPTION_TRUNCATED=1` if body >4KB) |
| Run / task UUID | `$PAPERCLIP_RUN_ID`, `$PAPERCLIP_TASK_ID` |
| Wake reason / comment | `$PAPERCLIP_WAKE_REASON`, `$PAPERCLIP_WAKE_COMMENT_ID`, `$PAPERCLIP_APPROVAL_ID` |
| API URL / key | `$PAPERCLIP_API_URL`, `$PAPERCLIP_API_KEY` (use `Authorization: Bearer $PAPERCLIP_API_KEY`) |

**Or read once from the manifest file:**

```bash
cat .paperclip-spawn-context.json
# Returns full SpawnIdentityContext: agent, company, issue, run, auth
```

**When you DO still need API**: issue body/description, comments history,
labels, attachments, work products. For identity + headline meta the env
vars are authoritative.

## 1. Identity and Context

- Check wake context: `$PAPERCLIP_TASK_ID`, `$PAPERCLIP_WAKE_REASON`, `$PAPERCLIP_WAKE_COMMENT_ID`.

## 2. Local Planning Check

1. Read today's plan from `$AGENT_HOME/memory/YYYY-MM-DD.md` under "## Today's Plan".
2. Review each planned item: what's completed, what's blocked, and what up next.
3. For any blockers, resolve them yourself or escalate to the board.
4. If you're ahead, start on the next highest priority.
5. Record progress updates in the daily notes.

## 3. Approval Follow-Up

If `PAPERCLIP_APPROVAL_ID` is set:

- Review the approval and its linked issues.
- Close resolved issues or comment on what remains open.

## 4. Get Assignments

- `GET /api/companies/{companyId}/issues?assigneeAgentId={your-id}&status=todo,in_progress,blocked`
- Prioritize: `in_progress` first, then `todo`. Skip `blocked` unless you can unblock it.
- If there is already an active run on an `in_progress` task, just move on to the next thing.
- If `PAPERCLIP_TASK_ID` is set and assigned to you, prioritize that task.

## 5. Checkout and Work

- Always checkout before working: `POST /api/issues/{id}/checkout`.
- Never retry a 409 -- that task belongs to someone else.
- Do the work. Update status and comment when done.

## 6. Delegation

- Create subtasks with `POST /api/companies/{companyId}/issues`. Always set `parentId` and `goalId`. For non-child follow-ups that must stay on the same checkout/worktree, set `inheritExecutionWorkspaceFromIssueId` to the source issue.
- Use `paperclip-create-agent` skill when hiring new agents.
- Assign work to the right agent for the job.

## 7. Fact Extraction

1. Check for new conversations since last extraction.
2. Extract durable facts to the relevant entity in `$AGENT_HOME/life/` (PARA).
3. Update `$AGENT_HOME/memory/YYYY-MM-DD.md` with timeline entries.
4. Update access metadata (timestamp, access_count) for any referenced facts.

## 8. Exit

- Comment on any in_progress work before exiting.
- If no assignments and no valid mention-handoff, exit cleanly.

---

## CEO Responsibilities

- Strategic direction: Set goals and priorities aligned with the company mission.
- Hiring: Spin up new agents when capacity is needed.
- Unblocking: Escalate or resolve blockers for reports.
- Budget awareness: Above 80% spend, focus only on critical tasks.
- Never look for unassigned work -- only work on what is assigned to you.
- Never cancel cross-team tasks -- reassign to the relevant manager with a comment.

## Rules

- Always use the Paperclip skill for coordination.
- Always include `X-Paperclip-Run-Id` header on mutating API calls.
- Comment in concise markdown: status line + bullets + links.
- Self-assign via checkout only when explicitly @-mentioned.
