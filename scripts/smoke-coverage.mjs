// Step 4 coverage smoke test. Against the local dev server + Supabase REST.
//   node scripts/smoke-coverage.mjs
// Seeds a requirement (line qty 1000), two OEMs, firm 600 + 400, checks the
// page shows full coverage, reclassifies 400 as availability, checks the
// uncovered balance, tests the zero-qty guard, then cleans up.

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
const APP = "http://localhost:3000";

async function rest(method, qs, body, prefer) {
  const res = await fetch(`${B}/${qs}`, {
    method,
    headers: prefer ? { ...H, Prefer: prefer } : H,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

const check = (label, got, expect) => {
  const pass = String(got).includes(expect);
  console.log(`${pass ? "PASS" : "FAIL"}  ${label}: expected "${expect}" in page -> ${pass}`);
  return pass;
};

let ok = true;
let reqId, oa, ob;

try {
  const r1 = await rest(
    "POST",
    "requirements?select=id",
    { tender_ref: "__smoke_cov__", customer: "__smoke__" },
    "return=representation",
  );
  reqId = r1.body[0].id;

  const line = await rest(
    "POST",
    "requirement_lines?select=id",
    { requirement_id: reqId, part_description: "smoke part", quantity: 1000 },
    "return=representation",
  );
  const lineId = line.body[0].id;

  const o1 = await rest("POST", "oems?select=id", { name: "__smoke_oemA__" }, "return=representation");
  const o2 = await rest("POST", "oems?select=id", { name: "__smoke_oemB__" }, "return=representation");
  oa = o1.body[0].id;
  ob = o2.body[0].id;

  await rest("POST", "line_coverage", { requirement_id: reqId, line_id: lineId, oem_id: oa, kind: "firm", quantity: 600 });
  await rest("POST", "line_coverage", { requirement_id: reqId, line_id: lineId, oem_id: ob, kind: "firm", quantity: 400 });

  let page = await (await fetch(`${APP}/requirements/${reqId}`)).text();
  console.log("-- firm 600 + 400 --");
  ok = check("required 1,000", page, "1,000") && ok;
  ok = check("fully covered", page, "Fully covered by firm commitments") && ok;

  await rest("PATCH", `line_coverage?requirement_id=eq.${reqId}&oem_id=eq.${ob}`, { kind: "availability" });
  page = await (await fetch(`${APP}/requirements/${reqId}`)).text();
  console.log("-- 400 reclassified as availability --");
  ok = check("not fully covered", page, "Not fully covered") && ok;
  ok = check("400 still uncovered", page, "400<") && ok;

  const bad = await rest("POST", "line_coverage", { requirement_id: reqId, line_id: lineId, oem_id: oa, kind: "firm", quantity: 0 });
  console.log(`-- zero-qty guard: HTTP ${bad.status} (expect 400 from the check constraint) --`);
  ok = (bad.status === 400) && ok;
} finally {
  if (reqId) await rest("DELETE", `requirements?id=eq.${reqId}`); // cascades lines + coverage
  for (const id of [oa, ob]) if (id) await rest("DELETE", `oems?id=eq.${id}`);
  console.log("cleaned up");
}

console.log(ok ? "RESULT: ALL PASS" : "RESULT: FAILURES");
process.exitCode = ok ? 0 : 1;
