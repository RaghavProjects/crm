import Link from "next/link";
import { listRequirements } from "@/lib/requirements";
import { RequirementsTable } from "@/components/RequirementsTable";
import { plural } from "@/lib/format";

export default async function RequirementsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const sp = await searchParams;
  const res = await listRequirements();
  const rows = res.rows;

  const open = rows.filter((r) => !["won", "lost", "cancelled"].includes(r.status));

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="label">Sales</span>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight">Requirements</h1>
          <p className="mt-1 text-sm text-muted">
            {res.ok ? `${plural(open.length, "open requirement")} of ${rows.length}` : "Requirement pipeline"}
          </p>
        </div>
        <Link
          href="/requirements/new"
          className="rounded-control bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
        >
          + New requirement
        </Link>
      </div>

      {sp.created && (
        <div className="panel border-success/30 bg-forest-tint p-3 text-sm text-success">
          Requirement saved.
        </div>
      )}

      {!res.ok && (
        <div className="panel border-danger/30 bg-critical-tint p-3 text-sm text-danger">
          Requirements couldn&apos;t be loaded. Your other CRM data is still available. {res.error}
        </div>
      )}

      {res.ok && rows.length === 0 && (
        <div className="panel p-12 text-center">
          <p className="text-sm font-medium">No requirements yet</p>
          <p className="mt-1 text-sm text-muted">Add the first RFI to start the desk.</p>
          <Link href="/requirements/new" className="mt-4 inline-block rounded-control bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover">
            + New requirement
          </Link>
        </div>
      )}

      {res.ok && rows.length > 0 && <RequirementsTable rows={rows} />}
    </div>
  );
}
