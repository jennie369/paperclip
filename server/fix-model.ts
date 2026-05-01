import { createDb, agents } from "@paperclip/db";
import { eq } from "drizzle-orm";
import path from "path";

async function run() {
  const dataDir = path.resolve(process.cwd(), "../data/pglite");
  const db = await createDb({ dataDir });
  
  const allAgents = await db.select().from(agents);
  for (const agent of allAgents) {
    if (agent.adapterConfig && agent.adapterConfig.model === "gemini-3.1-pro") {
      console.log(`Updating agent ${agent.name} (${agent.id})`);
      const newConfig = { ...agent.adapterConfig, model: "gemini-3.1-pro-preview-customtools" };
      await db.update(agents)
        .set({ adapterConfig: newConfig })
        .where(eq(agents.id, agent.id));
      console.log("Done");
    }
  }
}

run().catch(console.error);
