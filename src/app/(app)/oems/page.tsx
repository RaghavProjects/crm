import Link from "next/link";
import { listOems } from "@/lib/oems";
import { OemTable } from "@/components/OemTable";
import { plural } from "@/lib/format";

export default async function OemsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const sp = await searchParams;
  const res = await listOems();

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="label">Sales</span>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight">OEMs</h1>
          <p className="mt-1 text-sm text-muted">
            {res.ok ? plural(res.rows.length, "supplier") : "Supplier / OEM management"}
          </p>
        </div>
        <Link
          href="/oems/new"
          className="rounded-control bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
        >
          + New OEM
        </Link>
      </div>

      {sp.created && <div className="panel border-success/30 bg-forest-tint p-3 text-sm text-success">OEM saved.</div>}

      {!res.ok && (
        <div className="panel border-danger/30 bg-critical-tint p-3 text-sm text-danger">
          OEMs couldn&apos;t be loaded. {res.error}
        </div>
      )}

      {res.ok && res.rows.length === 0 && (
        <div className="panel p-12 text-center text-sm text-muted">
          No OEMs yet — add the first supplier to start sourcing.
        </div>
      )}

      {res.ok && res.rows.length > 0 && <OemTable rows={res.rows} />}
    </div>
  );
}
