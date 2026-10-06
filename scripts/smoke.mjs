// Step 2 smoke test. Verifies the schema, then (by default) inserts a temporary
// requirement with line items, reads it back, and deletes it.
//   node scripts/smoke.mjs          -> verify + insert + read + clean up
//   node scripts/smoke.mjs seed     -> insert and keep (for a UI check)
//   node scripts/smoke.mjs clean    -> delete any rows this script created
// Prints no secrets.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const path = fileURLToPath(new URL("../.env.local", import.meta.url));
const env = {};
for (const line of readFileSync(path, "utf8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#") || !t.includes("=")) continue;
  const i = t.indexOf("=");
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}

const base = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1`;
const headers = {
  apikey: env.SUPABASE_SECRET_KEY,
  Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
  "Content-Type": "application/json",
};

async function rest(method, qs, body, prefer) {
  const res = await fetch(`${base}/${qs}`, {
    method,
    headers: prefer ? { ...headers, Prefer: prefer } : headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${qs} -> ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

const mode = process.argv[2] ?? "roundtrip";
const marker = "__smoke__";

async function clean() {
  const rows = await rest("GET", `requirements?select=id&customer=eq.${marker}`);
  for (const r of rows) {
    await rest("DELETE", `requirements?id=eq.${r.id}`);
  }
  return rows.length;
}

if (mode === "clean") {
  console.log("cleaned rows:", await clean());
} else {
  const statuses = await rest(
    "GET",
    "requirement_status?select=code&order=sort_order.asc",
  );
  console.log("statuses:", statuses.map((s) => s.code).join(", "));

  await clean();
  const before = await rest("GET", "requirements?select=id");
  console.log("requirements before:", before.length);

  const [req] = await rest(
    "POST",
    "requirements?select=id",
    {
      tender_ref: "SMOKE-TEST",
      customer: marker,
      project: "smoke",
      submission_deadline: "2026-11-01",
    },
    "return=representation",
  );
  await rest(
    "POST",
    "requirement_lines",
    [1, 2, 3].map((n) => ({
      requirement_id: req.id,
      part_description: `smoke part ${n}`,
      quantity: n * 10,
      sort_order: n - 1,
    })),
  );

  const read = await rest(
    "GET",
    `requirements?select=id,tender_ref,status,requirement_lines(count)&customer=eq.${marker}`,
  );
  console.log(
    "read back:",
    JSON.stringify({
      tender_ref: read[0].tender_ref,
      status: read[0].status,
      lines: read[0].requirement_lines[0].count,
    }),
  );

  if (mode === "seed") {
    console.log("seeded id:", req.id);
  } else {
    const removed = await clean();
    const after = await rest("GET", "requirements?select=id");
    console.log("cleaned rows:", removed, "| requirements after:", after.length);
  }
}
