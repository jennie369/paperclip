const { Client } = require('pg');

async function migrate() {
  const client = new Client({
    connectionString: 'postgresql://postgres.pgfkbcnzqozzkohwbgbk:gemtralabs123@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
  });

  try {
    await client.connect();
    
    // Check if the enum type exists and current values
    const res = await client.query(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = 'adapter_type'::regtype;
    `);
    
    const types = res.rows.map(r => r.enumlabel);
    console.log("Current adapter_type enum values:", types);

    if (!types.includes("ollama")) {
      console.log("Adding 'ollama' to adapter_type enum...");
      await client.query(`ALTER TYPE adapter_type ADD VALUE 'ollama';`);
      console.log("Successfully added 'ollama' to enum.");
    } else {
      console.log("'ollama' already exists in adapter_type enum.");
    }
  } catch (error) {
    if (error.message.includes('type "adapter_type" does not exist')) {
      console.log("Enum adapter_type does not seem to exist. It might be a regular varchar column.");
      // Let's check the column type just to be sure
      const colRes = await client.query(`
        SELECT data_type, udt_name 
        FROM information_schema.columns 
        WHERE table_name = 'agents' AND column_name = 'adapter_type';
      `);
      console.log("Column info for agents.adapter_type:", colRes.rows);
    } else {
      console.error("Migration error:", error);
    }
  } finally {
    await client.end();
  }
}

migrate();
