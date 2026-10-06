import Link from "next/link";

export default function DemoReadonlyPage() {
  return (
    <div className="grid min-h-dvh place-items-center bg-page p-4">
      <div className="w-full max-w-md panel p-6 text-center">
        <span aria-hidden className="text-2xl text-accent">
          ✦
        </span>
        <h1 className="mt-2 text-lg font-semibold tracking-tight">
          Demo is read-only
        </h1>
        <p className="mt-2 text-sm text-muted">
          You&apos;re exploring the CRM as a guest, so changes aren&apos;t saved.
          Sign in with an account to create or edit records.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Link
            href="/"
            className="rounded-control bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
          >
            Back to CRM
          </Link>
          <Link
            href="/login"
            className="rounded-control border border-border px-4 py-2 text-sm font-medium hover:bg-page"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
