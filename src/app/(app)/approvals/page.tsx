import { listApprovals } from "@/lib/masters";
import { expiryState } from "@/lib/documents";
import { createApprovalAction } from "./actions";

const input =
  "w-full rounded-control border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary";
const label = "block text-xs font-medium text-muted";

const expiryStyle: Record<string, string> = {
  none: "text-muted",
  ok: "text-success",
  soon: "text-warning",
  expired: "text-danger",
};
const expiryLabel: Record<string, string> = {
  none: "No expiry",
  ok: "Valid",
  soon: "Expiring soon",
  expired: "Expired",
};

function fmt(d: string | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${d}T00:00:00Z`));
}

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const sp = await searchParams;
  const res = await listApprovals();

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <div>
        <span className="label">Library</span>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight">Approvals</h1>
        <p className="mt-1 text-sm text-muted">
          Compliance certificates — CEMILAC, LCSO, RCMA and renewals.
        </p>
      </div>

      {sp.error && (
        <div className="panel border-danger/30 bg-critical-tint p-3 text-sm text-danger">{sp.error}</div>
      )}
      {sp.ok && (
        <div className="panel border-success/30 bg-forest-tint p-3 text-sm text-success">Approval saved.</div>
      )}

      <section className="panel p-4 md:p-6">
        <h2 className="text-sm font-semibold">Add an approval</h2>
        <form action={createApprovalAction} className="mt-4 grid gap-3 sm:grid-cols-4">
          <div>
            <label className={label} htmlFor="authority">Authority *</label>
            <input id="authority" name="authority" required className={input} />
          </div>
          <div>
            <label className={label} htmlFor="oem">OEM</label>
            <input id="oem" name="oem" className={input} />
          </div>
          <div>
            <label className={label} htmlFor="certificate_no">Certificate no.</label>
            <input id="certificate_no" name="certificate_no" className={input} />
          </div>
          <div>
            <label className={label} htmlFor="valid_till">Valid till</label>
            <input id="valid_till" name="valid_till" type="date" className={input} />
          </div>
          <div className="sm:col-span-4">
            <button type="submit" className="rounded-control bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover">
              Save approval
            </button>
          </div>
        </form>
      </section>

      {!res.ok && (
        <div className="panel border-danger/30 bg-critical-tint p-3 text-sm text-danger">
          Could not load approvals: {res.error}
        </div>
      )}

      {res.ok && res.rows.length === 0 && (
        <div className="panel p-10 text-center text-sm text-muted">No approvals yet.</div>
      )}

      {res.rows.length > 0 && (
        <div className="overflow-hidden panel">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="label px-4 py-2.5 font-medium">Authority</th>
                <th className="label px-4 py-2.5 font-medium">OEM</th>
                <th className="label px-4 py-2.5 font-medium">Certificate</th>
                <th className="label px-4 py-2.5 font-medium">Valid till</th>
                <th className="label px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {res.rows.map((a) => {
                const state = expiryState(a.valid_till);
                return (
                  <tr key={a.id} className="border-b border-border last:border-0 hover:bg-page/60">
                    <td className="px-4 py-3 font-medium">{a.authority ?? "—"}</td>
                    <td className="px-4 py-3 text-muted">{a.oem ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-[13px] text-muted">{a.certificate_no ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-[13px]">{fmt(a.valid_till)}</td>
                    <td className={`px-4 py-3 text-xs font-medium ${expiryStyle[state]}`}>
                      {expiryLabel[state]}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
