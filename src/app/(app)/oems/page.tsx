import Link from "next/link";
import { listOems } from "@/lib/oems";

export default async function OemsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const sp = await searchParams;
  const res = await listOems();

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight md:text-[28px]">
            OEMs
          </h1>
          <p className="mt-1 text-sm text-muted">
            The supplier network — products, capabilities, lead time, approval
            and commission.
          </p>
        </div>
        <Link
          href="/oems/new"
          className="rounded-control bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + New OEM
        </Link>
      </div>

      {sp.created && (
        <div className="rounded-card border border-success/30 bg-success/10 p-3 text-sm text-success">
          OEM saved.
        </div>
      )}

      {!res.ok && (
        <div className="rounded-card border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          Could not load OEMs: {res.error}
        </div>
      )}

      {res.ok && res.rows.length === 0 && (
        <div className="rounded-card border border-border bg-surface p-10 text-center">
          <p className="text-sm font-medium">No OEMs yet</p>
          <p className="mt-1 text-sm text-muted">
            Add the first supplier to start sourcing requirements.
          </p>
          <Link
            href="/oems/new"
            className="mt-4 inline-block rounded-control bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            + New OEM
          </Link>
        </div>
      )}

      {res.rows.length > 0 && (
        <>
          <div className="hidden overflow-hidden rounded-card border border-border bg-surface md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-page text-xs text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">OEM</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Products</th>
                  <th className="px-4 py-3 text-right font-medium">Lead time</th>
                  <th className="px-4 py-3 text-right font-medium">Commission</th>
                  <th className="px-4 py-3 font-medium">Approved</th>
                </tr>
              </thead>
              <tbody>
                {res.rows.map((o) => (
                  <tr key={o.id} className="border-t border-border hover:bg-page/60">
                    <td className="px-4 py-3 font-medium">{o.name}</td>
                    <td className="px-4 py-3 text-muted">{o.location ?? "—"}</td>
                    <td className="px-4 py-3 text-muted">{o.products ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {o.lead_time_days != null ? `${o.lead_time_days} d` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {o.commission_pct != null ? `${o.commission_pct}%` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          o.approved
                            ? "bg-success/15 text-success"
                            : "bg-border/60 text-muted"
                        }`}
                      >
                        {o.approved ? "Approved" : "Not approved"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {res.rows.map((o) => (
              <div
                key={o.id}
                className="rounded-card border border-border bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{o.name}</div>
                    <div className="truncate text-xs text-muted">
                      {o.location ?? "—"}
                    </div>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      o.approved
                        ? "bg-success/15 text-success"
                        : "bg-border/60 text-muted"
                    }`}
                  >
                    {o.approved ? "Approved" : "Not approved"}
                  </span>
                </div>
                <div className="mt-2 text-xs text-muted">{o.products ?? "—"}</div>
                <div className="mt-1 text-xs text-muted">
                  Lead {o.lead_time_days != null ? `${o.lead_time_days} d` : "—"}
                  {o.commission_pct != null ? ` · ${o.commission_pct}%` : ""}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
