import Link from "next/link";
import { searchAll } from "@/lib/search";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q ?? "";
  const res =
    q.trim().length >= 2
      ? await searchAll(q)
      : { requirements: [], oems: [], orders: [] };
  const total =
    res.requirements.length + res.oems.length + res.orders.length;

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight">Search</h1>
        <p className="mt-1 text-sm text-muted">
          Across requirements, OEMs and purchase orders.
        </p>
      </div>

      <form action="/search" method="get" className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search tender ref, customer, product, OEM, PO number…"
          className="w-full rounded-control border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <button
          type="submit"
          className="rounded-control bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Search
        </button>
      </form>

      {q && total === 0 && (
        <div className="rounded-card border border-border bg-surface p-8 text-center text-sm text-muted">
          No matches for “{q}”.
        </div>
      )}

      {res.requirements.length > 0 && (
        <section className="rounded-card border border-border bg-surface">
          <div className="border-b border-border px-4 py-3 text-sm font-semibold">
            Requirements ({res.requirements.length})
          </div>
          <div className="divide-y divide-border">
            {res.requirements.map((r) => (
              <Link
                key={r.id}
                href={`/requirements/${r.id}`}
                className="flex items-center justify-between px-4 py-3 text-sm hover:bg-page/60"
              >
                <span className="font-medium">{r.tender_ref}</span>
                <span className="text-muted">
                  {r.customer} · {r.status}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {res.oems.length > 0 && (
        <section className="rounded-card border border-border bg-surface">
          <div className="border-b border-border px-4 py-3 text-sm font-semibold">
            OEMs ({res.oems.length})
          </div>
          <div className="divide-y divide-border">
            {res.oems.map((o) => (
              <div key={o.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="font-medium">{o.name}</span>
                <span className="text-muted">{o.products ?? ""}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {res.orders.length > 0 && (
        <section className="rounded-card border border-border bg-surface">
          <div className="border-b border-border px-4 py-3 text-sm font-semibold">
            Orders ({res.orders.length})
          </div>
          <div className="divide-y divide-border">
            {res.orders.map((o) => (
              <Link
                key={o.id}
                href={`/orders/${o.id}`}
                className="block px-4 py-3 text-sm font-medium hover:bg-page/60"
              >
                PO {o.po_number}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
