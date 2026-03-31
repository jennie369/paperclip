import postgres from "postgres";
import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const sql = postgres("postgresql://postgres:postgres@127.0.0.1:54329/postgres", { max: 1, idle_timeout: 10 });

const restorePath = join(homedir(), "paperclip_restore.sql");
const content = readFileSync(restorePath, "utf-8");

const lines = content.split("\n").filter(l => l.startsWith("INSERT INTO"));
console.log(`Restoring ${lines.length} INSERT statements...`);

let ok = 0, skip = 0, err = 0;
for (const line of lines) {
  try {
    await sql.unsafe(line);
    ok++;
  } catch (e) {
    if (e.message?.includes("duplicate key") || e.message?.includes("already exists")) {
      skip++;
    } else {
      err++;
      if (err <= 5) console.log(`ERR: ${e.message?.substring(0, 120)}`);
    }
  }
}

console.log(`Done: ${ok} inserted, ${skip} skipped (dup), ${err} errors`);

const companies = await sql`SELECT id, name, status FROM companies`;
console.log(`Companies: ${JSON.stringify(companies)}`);

const agents = await sql`SELECT name FROM agents ORDER BY name`;
console.log(`Agents (${agents.length}): ${agents.map(a => a.name).join(", ")}`);

await sql.end();
