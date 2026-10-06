// Import the shared workbook rows into Supabase, replacing the demo data.
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
const d = (v) => (isDate(v) ? v : null);

const data = JSON.parse(
  readFileSync(fileURLToPath(new URL("./workbook-data.json", import.meta.url)), "utf8"),
);

// Clear existing demo data (cascades lines/quotes/orders/invoices…).
for (const t of ["requirements", "oems", "documents", "customers", "approvals"]) {
  await rest("DELETE", `${t}?id=not.is.null`);
}
console.log("cleared requirements, oems, documents, customers, approvals");

// --- OEMs: master rows + names seen in transactional sheets -----------------
const oemNames = new Set();
for (const o of data.oems) if (o.OEM) oemNames.add(o.OEM);
for (const e of data.enquiries) if (e.OEM) oemNames.add(e.OEM);
for (const p of data.pos) if (p.OEM) oemNames.add(p.OEM);
const oems = oemNames.size
  ? await rest(
      "POST",
      "oems?select=id,name",
      [...oemNames].map((name) => {
        const m = data.oems.find((o) => o.OEM === name);
        return {
          name,
          location: m?.Loaction ?? null,
          vendor_code: m?.["Vendor Code"] ?? null,
          products: m?.["ITEMS APPROVED"] ?? null,
          approved: Boolean(m),
        };
      }),
      "return=representation",
    )
  : [];
const oemId = new Map(oems.map((o) => [o.name, o.id]));
console.log(`oems inserted: ${oems.length}`);

// --- Customers master ------------------------------------------------------
if (data.customers?.length) {
  await rest("POST", "customers", data.customers.map((c) => ({
    name: c.Customer || "—",
    location: c.Loaction || null,
    gst_no: c["GST No."] || null,
    items_approved: c["ITEMS APPROVED"] || null,
    product_code: c["PRODUCT CODE"] || null,
    renewal_due: d(c["TO APPLY FOR RENEWAL"]),
  })));
  console.log(`customers inserted: ${data.customers.length}`);
}

// --- Approvals / compliance master -----------------------------------------
if (data.approvals?.length) {
  await rest("POST", "approvals", data.approvals.map((a) => ({
    oem: a.OEM || null,
    authority: a["APP AUTH"] || null,
    location: a.LOC || null,
    certificate_no: a["CERTIFICATE NO."] || null,
    certificate_date: d(a["CER DT"]),
    valid_till: d(a["VALID TILL"]),
    items_approved: a["ITEMS APPROVED"] || null,
    product_code: a["PRODUCT CODE"] || null,
    renewal_due: d(a["TO APPLY FOR RENEWAL"]),
    remarks: a.REMARKS || null,
  })));
  console.log(`approvals inserted: ${data.approvals.length}`);
}

// --- Enquiries -> requirements + line + sourcing link ----------------------
const reqByTender = new Map();
let reqCount = 0;
let lineCount = 0;
let sourcingCount = 0;
for (const e of data.enquiries) {
  const [req] = await rest(
    "POST",
    "requirements?select=id",
    {
      tender_ref: e["ENQ No."] || "—",
      customer: e.CUS || "—",
      project: e.Project || null,
      source: e.SOURCE || null,
      submission_deadline: d(e["DUE ON"]),
      status: e["QTN REF"] ? "quoted" : "received",
      notes: e.Remarks || null,
    },
    "return=representation",
  );
  reqCount++;
  reqByTender.set(e["ENQ No."], req.id);
  await rest("POST", "requirement_lines", {
    requirement_id: req.id,
    part_description: e.PRODUCT || "—",
    client_part_no: e["PRODUCT CODE"] || null,
    oem_part_no: e["MNFRS CODE"] || null,
    quantity: num(e["Qty. (No.)"]),
    sort_order: 0,
  });
  lineCount++;
  if (e.OEM && oemId.get(e.OEM)) {
    await rest("POST", "requirement_oems", {
      requirement_id: req.id,
      oem_id: oemId.get(e.OEM),
      status: "requested",
      requested_on: new Date().toISOString().slice(0, 10),
      request_notes: e.SOURCE ? `Source: ${e.SOURCE}` : null,
    });
    sourcingCount++;
  }
}

// --- Quotations sheet -> quotes for the enquiry requirements ---------------
let quoteCount = 0;
for (const q of data.quotations ?? []) {
  const requirementId = reqByTender.get(q["Enq No."]);
  if (!requirementId) continue;
  const [quote] = await rest(
    "POST",
    "quotes?select=id",
    { requirement_id: requirementId, version: 1, status: "approved" },
    "return=representation",
  );
  quoteCount++;
  await rest("POST", "quote_lines", {
    quote_id: quote.id,
    description: q.PRODUCT || "—",
    quantity: num(q.Qty),
    oem_price: num(q["1st Rate"]) ?? 0,
    recommended_price: num(q["Price after PNC"]) ?? num(q["1st Rate"]) ?? 0,
    sort_order: 0,
  });
}

// --- POs -> requirement (won) + quote + order ------------------------------
const posRows = data.pos.filter(
  (p) => p.PRODUCT && p.CUS && p["PO No"] && p["PO No"] !== "0",
);
let orderCount = 0;
for (const p of posRows) {
  const [req] = await rest(
    "POST",
    "requirements?select=id",
    {
      tender_ref: p["QTN REF"] || p["PO No"],
      customer: p.CUS,
      source: p.SOURCE || null,
      submission_deadline: d(p["DELY DUE ON"]),
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
      quantity: num(p["Qty. (No.)"]),
      oem_price: price,
      recommended_price: price,
      sort_order: 0,
    });
  }

  await rest("POST", "orders", {
    requirement_id: req.id,
    quote_id: quote.id,
    po_number: p["PO No"],
    po_date: d(p["PO  DATE"]),
    delivery_deadline: d(p["DELY DUE ON"]),
    oem_id: p.OEM && oemId.get(p.OEM) ? oemId.get(p.OEM) : null,
    status: "open",
    notes: p.Remarks || null,
  });
  orderCount++;
}

console.log(
  `inserted: requirements=${reqCount} lines=${lineCount} quotes=${quoteCount} orders=${orderCount} sourcing=${sourcingCount}`,
);
