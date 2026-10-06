"use client";

import { useEffect, useState } from "react";

// Intercepts create/save interactions for guests and explains that guest mode
// is read-only, instead of silently bouncing them to /demo-readonly.
export function GuestGuard({ isGuest }: { isGuest: boolean }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isGuest) return;

    const onSubmit = (e: Event) => {
      const form = e.target as HTMLFormElement;
      const isServerAction =
        !!form.querySelector('input[name^="$ACTION_"]') ||
        (form.getAttribute("method") || "").toLowerCase() === "post";
      if (isServerAction) {
        e.preventDefault();
        e.stopPropagation();
        setShow(true);
      }
    };

    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement)?.closest?.("a");
      if (!a) return;
      const href = a.getAttribute("href") || "";
      if (
        a.hasAttribute("data-guest-block") ||
        href.startsWith("/requirements/new") ||
        href.startsWith("/oems/new")
      ) {
        e.preventDefault();
        e.stopPropagation();
        setShow(true);
      }
    };

    document.addEventListener("submit", onSubmit, true);
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("submit", onSubmit, true);
      document.removeEventListener("click", onClick, true);
    };
  }, [isGuest]);

  if (!isGuest || !show) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-label="Guest mode"
    >
      <div className="w-full max-w-sm rounded-card border border-border bg-surface p-5 text-center shadow-sm">
        <div className="text-base font-semibold">Guest mode — read only</div>
        <p className="mt-2 text-sm text-muted">
          Guests can&apos;t add or save records. Sign in to make changes.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <a
            href="/login"
            className="rounded-control bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
          >
            Sign in
          </a>
          <button
            type="button"
            onClick={() => setShow(false)}
            className="rounded-control border border-border px-4 py-2 text-sm font-medium hover:bg-page"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
