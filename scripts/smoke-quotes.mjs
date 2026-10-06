// Step 6 smoke test (REST only): verifies the quotes schema and the past_bids
// view. Seeds a won requirement with a quote line, then checks the view returns
// it as a comparable past bid. Cleans up.
//   node scripts/smoke-quotes.mjs

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

const B = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1`;
const H = {
  apikey: env.SUPABASE_SECRET_KEY,
  Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
  "Content-Type": "application/json",
};

async function rest(method, qs, body, prefer) {
  const res = await fetch(`${B}/${qs}`, {
    method,
    headers: prefer ? { ...H, Prefer: prefer } : H,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

let ok = true;
let reqA, reqB;

try {
  await rest("DELETE", "requirements?customer=eq.__smoke__");

  const b = await rest("POST", "requirements?select=id", { tender_ref: "__smoke_qB__", customer: "__smoke__", status: "won" }, "return=representation");
  reqB = b.body[0].id;
  await rest("POST", "requirement_lines", { requirement_id: reqB, part_description: "Smoke Widget", quantity: 10 });

  const q = await rest("POST", "quotes?select=id", { requirement_id: reqB, version: 1, status: "approved" }, "return=representation");
  const quoteId = q.body[0].id;
  await rest("POST", "quote_lines", { quote_id: quoteId, description: "Smoke Widget", quantity: 10, oem_price: 100, margin_pct: 20, recommended_price: 120 });

  const a = await rest("POST", "requirements?select=id", { tender_ref: "__smoke_qA__", customer: "__smoke__" }, "return=representation");
  reqA = a.body[0].id;
  await rest("POST", "requirement_lines", { requirement_id: reqA, part_description: "Smoke Widget" });

  const qenc = encodeURIComponent("Smoke Widget");
  const bids = await rest("GET", `past_bids?select=description,oem_price,recommended_price,requirement_status,tender_ref&requirement_status=in.(won,lost)&description=ilike.*${qenc}*&requirement_id=neq.${reqA}`);
  console.log("past_bids rows:", JSON.stringify(bids.body));

  const found = Array.isArray(bids.body) && bids.body.some((r) => r.tender_ref === "__smoke_qB__" && Number(r.recommended_price) === 120 && r.requirement_status === "won");
  console.log(`${found ? "PASS" : "FAIL"}  past_bids returns the won bid with recommended 120`);
  ok = found && ok;

  const qrows = await rest("GET", `quotes?select=id,version,status&requirement_id=eq.${reqB}`);
  console.log("quotes for reqB:", JSON.stringify(qrows.body));
} finally {
  for (const id of [reqA, reqB]) if (id) await rest("DELETE", `requirements?id=eq.${id}`);
  console.log("cleaned up");
}

console.log(ok ? "RESULT: ALL PASS" : "RESULT: FAILURES");
process.exitCode = ok ? 0 : 1;
