import Link from "next/link";
import { listRequirements, type RequirementRow } from "@/lib/requirements";

const statusColor: Record<string, string> = {
  received: "bg-muted",
  qualifying: "bg-warning",
  quoted: "bg-primary",
  submitted: "bg-primary",
  won: "bg-success",
  lost: "bg-danger",
  cancelled: "bg-muted",
};

const DAY = 86_400_000;

function daysLeft(deadline: string) {
  const due = new Date(`${deadline}T00:00:00Z`).getTime();
  return Math.round((due - Date.now()) / DAY);
}

function formatDate(deadline: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${deadline}T00:00:00Z`));
}

function StatusDot({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className={`size-1.5 rounded-full ${statusColor[value] ?? "bg-muted"}`} />
      <span className="capitalize text-ink">{value}</span>
    </span>
  );
}

function isOpen(r: RequirementRow) {
  return !["won", "lost", "cancelled"].includes(r.status);
}

export default async function RequirementsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const sp = await searchParams;
  const res = await listRequirements();
  const rows = res.rows;

  const open = rows.filter(isOpen);
  const submitted = rows.filter((r) => r.status === "submitted");
  const won = rows.filter((r) => r.status === "won");
  const atRisk = open.filter(
    (r) => r.submission_deadline && daysLeft(r.submission_deadline) <= 7,
  );

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="label">Work</span>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight">
            Requirements
          </h1>
        </div>
        <Link
          href="/requirements/new"
          className="rounded-control bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + New requirement
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-y border-border py-2.5 text-sm text-muted">
        <span>
          <b className="font-semibold text-ink">{open.length}</b> open
        </span>
        <span aria-hidden className="text-border">·</span>
        <span>
          <b className="font-semibold text-ink">{submitted.length}</b> submitted
        </span>
        <span aria-hidden className="text-border">·</span>
        <span>
          <b className="font-semibold text-ink">{won.length}</b> won this month
        </span>
        <span aria-hidden className="text-border">·</span>
        <span className={atRisk.length > 0 ? "text-danger" : ""}>
          <b className="font-semibold">{atRisk.length}</b> at risk
        </span>
      </div>

      {sp.created && (
        <div className="rounded-card border border-success/30 bg-success/5 p-3 text-sm text-success">
          Requirement saved.
        </div>
      )}

      {!res.ok && (
        <div className="rounded-card border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
          Could not load requirements: {res.error}
        </div>
      )}

      {res.ok && rows.length === 0 && (
        <div className="rounded-card border border-border bg-surface p-12 text-center">
          <p className="text-sm font-medium">No requirements yet</p>
          <p className="mt-1 text-sm text-muted">
            Add the first RFI to start the desk.
          </p>
          <Link
            href="/requirements/new"
            className="mt-4 inline-block rounded-control bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            + New requirement
          </Link>
        </div>
      )}

      {rows.length > 0 && (
        <>
          <div className="hidden overflow-hidden rounded-card border border-border bg-surface md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="label px-4 py-2.5 font-medium">Tender ref</th>
                  <th className="label px-4 py-2.5 font-medium">Customer</th>
                  <th className="label px-4 py-2.5 font-medium">Project</th>
                  <th className="label px-4 py-2.5 text-right font-medium">
                    Lines
                  </th>
                  <th className="label px-4 py-2.5 font-medium">Deadline</th>
                  <th className="label px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="group border-t border-border hover:bg-page/70"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/requirements/${r.id}`}
                        className="font-mono text-[13px] font-medium group-hover:text-primary"
                      >
                        {r.tender_ref}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{r.customer}</td>
                    <td className="px-4 py-3 text-muted">{r.project ?? "—"}</td>
                    <td className="px-4 py-3 text-right">{r.lines}</td>
                    <td className="px-4 py-3">
                      {r.submission_deadline ? (
                        <span className="font-mono text-[13px]">
                          {formatDate(r.submission_deadline)}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                      {r.submission_deadline &&
                        isOpen(r) &&
                        daysLeft(r.submission_deadline) <= 7 && (
                          <span className="ml-2 text-xs font-medium text-danger">
                            {daysLeft(r.submission_deadline)}d
                          </span>
                        )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusDot value={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-2 md:hidden">
            {rows.map((r) => (
              <Link
                key={r.id}
                href={`/requirements/${r.id}`}
                className="block rounded-card border border-border bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-mono text-[13px] font-medium">
                      {r.tender_ref}
                    </div>
                    <div className="truncate text-xs text-muted">
                      {r.customer}
                      {r.project ? ` · ${r.project}` : ""}
                    </div>
                  </div>
                  <StatusDot value={r.status} />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted">
                  <span>{r.lines} line items</span>
                  <span className="font-mono">
                    {r.submission_deadline
                      ? formatDate(r.submission_deadline)
                      : "no deadline"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
