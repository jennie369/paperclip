---
title: Delegations
summary: Inline CEO → subagent handoff with fan-out + await
---

Delegations let a heartbeat agent give a sub-task to another agent in the same
company and optionally block on the result. Under the hood each delegation is
one row in `issues` with `origin_kind='delegation'` — the routes below surface
a convenience projection over that table plus the create / await / cancel
primitives.

Full feature spec: `crypto-pattern-scanner/memory/reports/2026-04-21-delegate-to-agent-plan.md`
ADR: `crypto-pattern-scanner/memory/decisions/2026-04-21-inline-agent-delegation.md`

## Feature Flag

All MUTATING endpoints (`POST /delegations`, `POST /delegations/await`,
`POST /delegations/:traceId/cancel`) are gated behind
`PAPERCLIP_DELEGATION_ENABLED=true`. When off, they return:

```
HTTP 503
{ "error": "Delegation feature is disabled (PAPERCLIP_DELEGATION_ENABLED=false)" }
```

Read-only endpoints (`GET /companies/:companyId/delegations` and
`GET /delegations/:traceId`) are **NOT** gated — the UI needs to render existing
delegation history even when the feature is off.

## Auth

Mutating routes require an **agent actor**: either an agent API key in the
`Authorization: Bearer` header, or (in `local_trusted` mode) an
`x-paperclip-run-id` header that resolves to a known `heartbeat_runs` row.
Caller agentId, companyId, and runId are derived from the actor — body fields
cannot override them.

Read-only routes accept board/session actors as well (for the
`/delegations` UI log page). Company isolation is still enforced.

## Create Delegation

```
POST /api/delegations
Headers:
  x-paperclip-run-id: {runId}     # local_trusted mode
  Authorization: Bearer {apiKey}  # authenticated mode
Body:
{
  "targetAgentId": "{uuid}",       // required — target agent UUID from agents table
  "task": "Fix BUG-041 in agent-config-routes.ts",  // required — 1..10_000 chars
  "turnMode": "do",                // optional: "ask" | "do" | "delegate" (default "do")
  "timeoutMs": 300000,             // optional: 30_000..1_800_000 (default 300_000)
  "callerIssueId": "{uuid}"        // optional — parent issue (for cycle detect + depth cap)
}
```

Response:

```json
{
  "delegationId": "{uuid}",    // same as issueId
  "issueId": "{uuid}",
  "traceId": "{uuid}",
  "status": "pending",
  "depth": 1,
  "meta": { "timeoutMs": 300000, "turnMode": "do" }
}
```

Errors:
- `400` — zod validation (missing `targetAgentId` / `task`, bad `turnMode`, timeout out of range)
- `401` — actor is not an agent, or caller agent not found
- `403` — actor's company does not match caller's company
- `409` — rate limit (10 active per caller), cycle detected, depth > 3, or target agent pending/terminated
- `422` — target agent in different company
- `503` — flag disabled

## Await Delegations

Blocks (server-side poll every 2s) until all listed delegations reach a
terminal state, or until `timeoutMs` elapses and the server auto-cancels any
still-pending delegation.

```
POST /api/delegations/await
{
  "traceIds": ["{uuid}", "{uuid}", ...],   // required — 1..50 UUIDs
  "timeoutMs": 300000                      // optional: 1_000..1_800_000
}
```

Response:

```json
{
  "results": [
    { "traceId": "{uuid}", "status": "done",      "durationMs": 12345 },
    { "traceId": "{uuid}", "status": "timeout",   "durationMs": 300000, "error": "timeout" },
    { "traceId": "{uuid}", "status": "cancelled", "durationMs": 8901 }
  ]
}
```

Statuses: `pending` | `in_progress` | `done` | `failed` | `cancelled` | `timeout`.

## Cancel Delegation

```
POST /api/delegations/{traceId}/cancel
{
  "reason": "nevermind — user changed direction"    // optional, max 500 chars
}
```

Only the original caller agent can cancel. Response `{ ok: true }`. Returns
`403` if a different agent attempts, `404` if traceId unknown.

## Get Delegation (read-only)

```
GET /api/delegations/{traceId}
```

Returns:

```json
{
  "id": "{uuid}",
  "traceId": "{uuid}",
  "companyId": "{uuid}",
  "callerAgentId": "{uuid}",
  "targetAgentId": "{uuid}",
  "parentIssueId": "{uuid}" | null,
  "status": "done",
  "requestedAt": "2026-04-21T19:55:32.309Z",
  "completedAt": "2026-04-21T20:01:05.123Z",
  "depth": 1,
  "meta": { "timeoutMs": 300000, "turnMode": "do" },
  "task": "Fix BUG-041 in agent-config-routes.ts"
}
```

NOT flag-gated. Board/session users can read for observability.

## List Delegations by Company (read-only)

```
GET /api/companies/{companyId}/delegations?limit=200
```

Reverse-chronological. `limit` clamped to `[1, 500]`, default `200`.

NOT flag-gated. Company isolation enforced (403 for non-admin session users
viewing a different company).

## MCP Tools

Heartbeat agents whose `mcp.json` points to `server/src/channels/crm/mcp-server.ts`
can call the delegation routes via stdio MCP tools — no HTTP client setup
needed.

### `delegate_to_agent`

Fire a non-blocking delegation. Returns `traceId` for later `await_delegation`.

```
[[CALL: delegate_to_agent({
  "target_agent_id": "{uuid}",
  "task": "Draft launch email for LAUNCH14",
  "turn_mode": "do",
  "timeout_ms": 300000
})]]
```

Snake_case args are mapped to camelCase on the wire. Handler reads
`PAPERCLIP_API_URL` + `PAPERCLIP_RUN_ID` env vars (injected by
`buildPaperclipEnv` at Claude CLI spawn) to HTTP-call back to the parent
Paperclip server.

### `await_delegation`

```
[[CALL: await_delegation({
  "trace_ids": ["{uuid}", "{uuid}"],
  "timeout_ms": 300000
})]]
```

## UI

`/GEM/delegations` — list view with search + status badges.
`/GEM/delegations/:traceId` — detail card with narrative, task, result comment,
timeline, links to parent issue + target agent, and trace id copy button.

Both routes are in `BOARD_ROUTE_ROOTS` (`ui/src/lib/company-routes.ts`), live
even when the feature flag is off (empty state instead of 503).

## See also

- `docs/ENV.md` § "Delegation feature" for full env var reference.
- `docs/RUNBOOK.md` § "Delegation Feature — Flip Procedure" for flip steps.
- `docs/api/issues.md` — the underlying issue resource that delegations
  project from.
