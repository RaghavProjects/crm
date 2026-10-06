import { listCustomers } from "@/lib/masters";
import { createCustomerAction } from "./actions";

const input =
  "w-full rounded-control border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary";
const label = "block text-xs font-medium text-muted";

function fmt(d: string | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${d}T00:00:00Z`));
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const sp = await searchParams;
  const res = await listCustomers();

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <div>
        <span className="label">Sales</span>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight">Customers</h1>
        <p className="mt-1 text-sm text-muted">
          Customer / agency master — identity, approvals and renewal dates.
        </p>
      </div>

      {sp.error && (
        <div className="panel border-danger/30 bg-critical-tint p-3 text-sm text-danger">{sp.error}</div>
      )}
      {sp.ok && (
        <div className="panel border-success/30 bg-forest-tint p-3 text-sm text-success">Customer saved.</div>
      )}

      <section className="panel p-4 md:p-6">
        <h2 className="text-sm font-semibold">Add a customer</h2>
        <form action={createCustomerAction} className="mt-4 grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className={label} htmlFor="name">Customer name *</label>
            <input id="name" name="name" required className={input} />
          </div>
          <div>
            <label className={label} htmlFor="location">Location</label>
            <input id="location" name="location" className={input} />
          </div>
          <div>
            <label className={label} htmlFor="gst_no">GST number</label>
            <input id="gst_no" name="gst_no" className={input} />
          </div>
          <div className="sm:col-span-4">
            <button type="submit" className="rounded-control bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover">
              Save customer
            </button>
          </div>
        </form>
      </section>

      {!res.ok && (
        <div className="panel border-danger/30 bg-critical-tint p-3 text-sm text-danger">
          Could not load customers: {res.error}
        </div>
      )}

      {res.ok && res.rows.length === 0 && (
        <div className="panel p-10 text-center text-sm text-muted">No customers yet.</div>
      )}

      {res.rows.length > 0 && (
        <div className="overflow-hidden panel">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="label px-4 py-2.5 font-medium">Customer</th>
                <th className="label px-4 py-2.5 font-medium">Location</th>
                <th className="label px-4 py-2.5 font-medium">GST</th>
                <th className="label px-4 py-2.5 font-medium">Items approved</th>
                <th className="label px-4 py-2.5 font-medium">Renewal due</th>
              </tr>
            </thead>
            <tbody>
              {res.rows.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-page/60">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-muted">{c.location ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-[13px] text-muted">{c.gst_no ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">{c.items_approved ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-[13px]">{fmt(c.renewal_due)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
