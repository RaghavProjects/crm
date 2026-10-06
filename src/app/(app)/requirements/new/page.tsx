import Link from "next/link";
import { RequirementForm } from "./RequirementForm";

export default async function NewRequirementPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/" className="text-xs text-muted hover:text-ink">
          ← Requirements
        </Link>
        <h1 className="mt-1 text-[26px] font-semibold tracking-tight">
          New requirement
        </h1>
        <p className="mt-1 text-sm text-muted">
          Capture the RFI / tender. Line items can be added now or later.
        </p>
      </div>

      {sp.error && (
        <div className="rounded-card border border-danger/30 bg-danger/10 p-3 text-sm text-[#b91c1c]">
          {sp.error}
        </div>
      )}

      <RequirementForm />
    </div>
  );
}
