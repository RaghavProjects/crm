// Step 2 migration runner.
// Reads SUPABASE_DB_URL from .env.local (never prints it), applies db/schema.sql,
// then verifies the tables and the status seed. Run: node scripts/migrate.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import pg from "pg";
const { Client } = pg;

function loadEnv() {
  const path = fileURLToPath(new URL("../.env.local", import.meta.url));
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = loadEnv();
const connectionString = env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error("SUPABASE_DB_URL is not set in .env.local");
  process.exit(1);
}

const sql = readFileSync(fileURLToPath(new URL("../db/schema.sql", import.meta.url)), "utf8");

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log("connected");
  await client.query(sql);
  console.log("schema applied");

  const tables = await client.query(
    `select table_name from information_schema.tables
      where table_schema = 'public' order by table_name`,
  );
  console.log("tables:", tables.rows.map((r) => r.table_name).join(", "));

  const statuses = await client.query(
    "select code from requirement_status order by sort_order",
  );
  console.log("statuses:", statuses.rows.map((r) => r.code).join(", "));
} catch (err) {
  console.error("migration failed:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
