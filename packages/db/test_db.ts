import postgres from 'postgres';

const DATABASE_URL = 'postgresql://postgres.pgfkbcnzqozzkohwbgbk:gemtrade2026@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres';
const sql = postgres(DATABASE_URL);

async function main() {
  try {
    const runs = await sql`
      SELECT id, context_snapshot
      FROM heartbeat_runs
      ORDER BY created_at DESC
      LIMIT 10
    `;
    console.log("Recent contextSnapshots:");
    for (const r of runs) {
      console.log(`runId: ${r.id}, issueId type: ${typeof r.context_snapshot?.issueId}, value: ${r.context_snapshot?.issueId}`);
      console.log(JSON.stringify(r.context_snapshot));
    }

    const issues = await sql`
      SELECT id, identifier
      FROM issues
      ORDER BY created_at DESC
      LIMIT 5
    `;
    console.log("\nRecent issues:");
    for (const i of issues) {
      console.log(`id: ${i.id}, identifier: ${i.identifier}`);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}

main();
