import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config();

const sql = postgres(process.env.DATABASE_URL!);

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
