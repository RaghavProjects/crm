import { listAudit } from "@/lib/audit";
import { getSessionUser } from "@/lib/supabase/server";

function when(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function AuditPage() {
  const user = await getSessionUser();
  if (!user) {
    return (
      <div className="mx-auto max-w-[800px] space-y-4">
        <div>
          <span className="label">Utility</span>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight">
            Audit trail
          </h1>
        </div>
        <div className="panel p-6 text-sm text-muted">
          The audit trail is available to signed-in users only. You&apos;re
          browsing the demo as a guest.
        </div>
      </div>
    );
  }

  const res = await listAudit();

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight">Audit trail</h1>
          <p className="mt-1 text-sm text-muted">
            Append-only record of material changes — what, who, when.
          </p>
        </div>
        <a
          href="/export"
          className="rounded-control border border-border px-3 py-2 text-sm font-medium hover:bg-page"
        >
          Download full export
        </a>
      </div>

      {!res.ok && (
        <div className="rounded-card border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          Could not load audit trail: {res.error}
        </div>
      )}

      {res.ok && res.rows.length === 0 && (
        <div className="rounded-card border border-border bg-surface p-10 text-center text-sm text-muted">
          No events recorded yet.
        </div>
      )}

      {res.rows.length > 0 && (
        <div className="overflow-hidden rounded-card border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-page text-xs text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Record</th>
              </tr>
            </thead>
            <tbody>
              {res.rows.map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="px-4 py-3 tabular-nums text-muted">
                    {when(e.at)}
                  </td>
                  <td className="px-4 py-3">{e.actor ?? "—"}</td>
                  <td className="px-4 py-3">{e.entity}</td>
                  <td className="px-4 py-3">{e.action}</td>
                  <td className="px-4 py-3 text-muted">
                    {e.entity_id ? `${e.entity_id.slice(0, 8)}…` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
