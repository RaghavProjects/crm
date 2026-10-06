import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;

  return (
    <div className="grid min-h-dvh place-items-center bg-page p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-control bg-primary text-[11px] font-semibold text-white">
            DC
          </span>
          <div className="leading-tight">
            <div className="text-sm font-semibold">Defence Contract CRM</div>
            <div className="text-[11px] text-muted">Sign in to continue</div>
          </div>
        </div>
        <div className="rounded-card border border-border bg-surface p-5">
          <LoginForm next={sp.next} />
        </div>
        <p className="mt-4 text-center text-[11px] text-muted">
          Internal access only. Accounts are created by an administrator.
        </p>
      </div>
    </div>
  );
}
