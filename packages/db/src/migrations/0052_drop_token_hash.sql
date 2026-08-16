-- GEM-622: Drop legacy token_hash column from agent_api_keys.
-- Root cause: DB initialized with token_hash; drizzle-kit push later added
-- key_hash NOT NULL without dropping token_hash. Code uses key_hash exclusively.
-- IF EXISTS makes this idempotent for fresh installs (migration 0000 never had token_hash).
ALTER TABLE "agent_api_keys" DROP COLUMN IF EXISTS "token_hash";
