import Link from "next/link";
import { OemForm } from "./OemForm";

export default async function NewOemPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/oems" className="text-xs text-muted hover:text-ink">
          ← OEMs
        </Link>
        <h1 className="mt-1 text-[26px] font-semibold tracking-tight">
          New OEM
        </h1>
        <p className="mt-1 text-sm text-muted">
          Record a supplier in the network. Approval and commission feed later
          sourcing and quoting.
        </p>
      </div>

      {sp.error && (
        <div className="rounded-card border border-danger/30 bg-danger/10 p-3 text-sm text-[#b91c1c]">
          {sp.error}
        </div>
      )}

      <OemForm />
    </div>
  );
}
