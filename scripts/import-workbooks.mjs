// Import the shared workbook rows into Supabase, replacing the test data.
//   node scripts/import-workbooks.mjs
// Reads scripts/workbook-data.json (produced by scripts/extract-workbooks.py).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const envPath = fileURLToPath(new URL("../.env.local", import.meta.url));
const env = {};
for (const line of readFileSync(envPath, "utf8").split("\n")) {
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
  if (!res.ok) throw new Error(`${method} ${qs} -> ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v ?? "");
const num = (v) => (v && !Number.isNaN(Number(v)) ? Number(v) : null);

const data = JSON.parse(
  readFileSync(fileURLToPath(new URL("./workbook-data.json", import.meta.url)), "utf8"),
);

const before = await Promise.all([
  rest("GET", "requirements?select=id"),
  rest("GET", "oems?select=id"),
  rest("GET", "orders?select=id"),
]);
console.log(
  `before: requirements=${before[0].length} oems=${before[1].length} orders=${before[2].length}`,
);

// Clear existing (test) rows. Deletes cascade to lines/quotes/orders/invoices…
await rest("DELETE", "requirements?id=not.is.null");
await rest("DELETE", "oems?id=not.is.null");
await rest("DELETE", "documents?id=not.is.null");
console.log("cleared requirements, oems, documents");

// --- OEMs: master rows + transactional names -------------------------------
const oemNames = new Set();
for (const o of data.oems) if (o.OEM) oemNames.add(o.OEM);
for (const e of data.enquiries) if (e.OEM) oemNames.add(e.OEM);
for (const p of data.pos) if (p.OEM) oemNames.add(p.OEM);

const oemRows = [...oemNames].map((name) => {
  const master = data.oems.find((o) => o.OEM === name);
  return {
    name,
    location: master?.Loaction ?? null,
    vendor_code: master?.["Vendor Code"] ?? null,
    products: master?.["ITEMS APPROVED"] ?? null,
    approved: Boolean(master),
  };
});
const oems = oemRows.length
  ? await rest("POST", "oems?select=id,name", oemRows, "return=representation")
  : [];
const oemId = new Map(oems.map((o) => [o.name, o.id]));
console.log(`oems inserted: ${oems.length}`);

// --- Enquiries -> requirements + line --------------------------------------
let reqCount = 0;
let lineCount = 0;
for (const e of data.enquiries) {
  const [req] = await rest(
    "POST",
    "requirements?select=id",
    {
      tender_ref: e["ENQ No."] || "—",
      customer: e.CUS || "—",
      project: e.Project || null,
      source: e.SOURCE || null,
      submission_deadline: isDate(e["DUE ON"]) ? e["DUE ON"] : null,
      status: e["QTN REF"] ? "quoted" : "received",
      notes: e.Remarks || null,
    },
    "return=representation",
  );
  reqCount++;
  await rest("POST", "requirement_lines", {
    requirement_id: req.id,
    part_description: e.PRODUCT || "—",
    client_part_no: e["PRODUCT CODE"] || null,
    oem_part_no: e["MNFRS CODE"] || null,
    quantity: num(e["Qty. (No.)"]),
    sort_order: 0,
  });
  lineCount++;
}

// --- POs -> requirement (won) + quote (approved) + order -------------------
const posRows = data.pos.filter(
  (p) => p.PRODUCT && p.CUS && p["PO No"] && p["PO No"] !== "0",
);
let quoteCount = 0;
let orderCount = 0;
for (const p of posRows) {
  const [req] = await rest(
    "POST",
    "requirements?select=id",
    {
      tender_ref: p["QTN REF"] || p["PO No"],
      customer: p.CUS,
      source: p.SOURCE || null,
      submission_deadline: isDate(p["DELY DUE ON"]) ? p["DELY DUE ON"] : null,
      status: "won",
      notes: p.Remarks || null,
    },
    "return=representation",
  );
  reqCount++;
  await rest("POST", "requirement_lines", {
    requirement_id: req.id,
    part_description: p.PRODUCT,
    client_part_no: p["PRODUCT CODE"] || null,
    quantity: num(p["Qty. (No.)"]),
    sort_order: 0,
  });
  lineCount++;

  const price = num(p["Price Rs/Ea"]);
  const qty = num(p["Qty. (No.)"]);
  const [quote] = await rest(
    "POST",
    "quotes?select=id",
    { requirement_id: req.id, version: 1, status: "approved" },
    "return=representation",
  );
  quoteCount++;
  if (price != null) {
    await rest("POST", "quote_lines", {
      quote_id: quote.id,
      description: p.PRODUCT,
      quantity: qty,
      oem_price: price,
      recommended_price: price,
      sort_order: 0,
    });
  }

  await rest("POST", "orders", {
    requirement_id: req.id,
    quote_id: quote.id,
    po_number: p["PO No"],
    po_date: isDate(p["PO  DATE"]) ? p["PO  DATE"] : null,
    delivery_deadline: isDate(p["DELY DUE ON"]) ? p["DELY DUE ON"] : null,
    oem_id: p.OEM && oemId.get(p.OEM) ? oemId.get(p.OEM) : null,
    status: "open",
    notes: p.Remarks || null,
  });
  orderCount++;
}

const after = await Promise.all([
  rest("GET", "requirements?select=id"),
  rest("GET", "oems?select=id"),
  rest("GET", "quotes?select=id"),
  rest("GET", "orders?select=id"),
]);
console.log(
  `after: requirements=${after[0].length} oems=${after[1].length} quotes=${after[2].length} orders=${after[3].length}`,
);
console.log(
  `inserted: requirements=${reqCount} lines=${lineCount} quotes=${quoteCount} orders=${orderCount}`,
);
