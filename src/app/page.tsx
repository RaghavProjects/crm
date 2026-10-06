import Link from "next/link";
import { listRequirements, type RequirementRow } from "@/lib/requirements";

const statusStyle: Record<string, string> = {
  received: "bg-border/60 text-muted",
  qualifying: "bg-warning/15 text-[#b45309]",
  quoted: "bg-primary/10 text-primary",
  submitted: "bg-primary/10 text-primary",
  won: "bg-success/15 text-[#15803d]",
  lost: "bg-danger/15 text-[#b91c1c]",
  cancelled: "bg-border/60 text-muted",
};

const statusLabel: Record<string, string> = {
  received: "Received",
  qualifying: "Qualifying",
  quoted: "Quoted",
  submitted: "Submitted",
  won: "Won",
  lost: "Lost",
  cancelled: "Cancelled",
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

function Badge({ value }: { value: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
        statusStyle[value] ?? "bg-border/60 text-muted"
      }`}
    >
      {statusLabel[value] ?? value}
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

  const tiles = [
    { label: "Open requirements", value: open.length },
    { label: "Submitted", value: submitted.length },
    { label: "Won (this month)", value: won.length },
    { label: "At risk ≤ 7 days", value: atRisk.length, danger: true },
  ];

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight md:text-[28px]">
            Requirements
          </h1>
          <p className="mt-1 text-sm text-muted">
            The central record. Every OEM sourcing, quote, PO and delivery hangs
            off a requirement.
          </p>
        </div>
        <Link
          href="/requirements/new"
          className="rounded-control bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + New requirement
        </Link>
      </div>

      {sp.created && (
        <div className="rounded-card border border-success/30 bg-success/10 p-3 text-sm text-[#15803d]">
          Requirement saved.
        </div>
      )}

      {!res.ok && (
        <div className="rounded-card border border-danger/30 bg-danger/10 p-3 text-sm text-[#b91c1c]">
          Could not load requirements: {res.error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="rounded-card border border-border bg-surface p-4"
          >
            <div className="text-xs text-muted">{t.label}</div>
            <div
              className={`mt-1 text-2xl font-semibold ${
                "danger" in t && t.danger && t.value > 0
                  ? "text-danger"
                  : "text-ink"
              }`}
            >
              {t.value}
            </div>
          </div>
        ))}
      </div>

      {res.ok && rows.length === 0 && (
        <div className="rounded-card border border-border bg-surface p-10 text-center">
          <p className="text-sm font-medium">No requirements yet</p>
          <p className="mt-1 text-sm text-muted">
            Add the first RFI to start the board.
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
              <thead className="bg-page text-xs text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Tender / Enquiry ref</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Project</th>
                  <th className="px-4 py-3 text-right font-medium">Lines</th>
                  <th className="px-4 py-3 font-medium">Submission deadline</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-page/60">
                    <td className="px-4 py-3 font-medium">{r.tender_ref}</td>
                    <td className="px-4 py-3 text-muted">{r.customer}</td>
                    <td className="px-4 py-3 text-muted">{r.project ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.lines}</td>
                    <td className="px-4 py-3">
                      {r.submission_deadline ? (
                        <>
                          <span className="tabular-nums">
                            {formatDate(r.submission_deadline)}
                          </span>
                          {isOpen(r) && daysLeft(r.submission_deadline) <= 7 && (
                            <span className="ml-2 text-xs font-medium text-danger">
                              {daysLeft(r.submission_deadline)}d
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge value={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {rows.map((r) => (
              <div
                key={r.id}
                className="rounded-card border border-border bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {r.tender_ref}
                    </div>
                    <div className="truncate text-xs text-muted">
                      {r.customer}
                      {r.project ? ` · ${r.project}` : ""}
                    </div>
                  </div>
                  <Badge value={r.status} />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted">
                  <span>{r.lines} line items</span>
                  <span className="tabular-nums">
                    {r.submission_deadline
                      ? formatDate(r.submission_deadline)
                      : "no deadline"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
