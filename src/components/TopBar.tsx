"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOutAction } from "@/app/(app)/actions";
import { askAction } from "@/app/(app)/ask-action";
import type { AskResult } from "@/lib/ask";

const CREATE_ITEMS = [
  { label: "New requirement", href: "/requirements/new" },
  { label: "New OEM", href: "/oems/new" },
  { label: "New quotation", href: "/quotations" },
  { label: "New order", href: "/orders" },
  { label: "Log payment", href: "/payments" },
  { label: "Upload document", href: "/documents" },
];

const SUGGESTED = [
  "At-risk orders",
  "Outstanding payments",
  "Pipeline this month",
  "Orders due this week",
];

const menu =
  "absolute right-0 z-40 mt-1 w-56 rounded-card border border-border bg-surface p-1 shadow-sm";
const menuItem = "block rounded-[4px] px-3 py-2 text-sm text-ink hover:bg-page";

export function TopBar({ email }: { email: string | null }) {
  const searchRef = useRef<HTMLInputElement>(null);
  const askInputRef = useRef<HTMLInputElement>(null);
  const [askOpen, setAskOpen] = useState(false);
  const [q, setQ] = useState("");
  const [result, setResult] = useState<AskResult | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") setAskOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (askOpen) askInputRef.current?.focus();
  }, [askOpen]);

  async function submit(question: string) {
    if (!question.trim()) return;
    setQ(question);
    setBusy(true);
    setResult(null);
    try {
      setResult(await askAction(question));
    } catch {
      setResult({ answered: false, message: "Could not reach the data." });
    } finally {
      setBusy(false);
    }
  }

  const initials = (email ?? "?").split("@")[0].slice(0, 2).toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-surface px-4">
        <form
          action="/search"
          method="get"
          className="hidden min-w-0 flex-1 items-center gap-2 rounded-control border border-border bg-page px-3 py-1.5 sm:flex"
        >
          <svg viewBox="0 0 16 16" className="size-4 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <circle cx="7" cy="7" r="4.5" />
            <path d="m10.5 10.5 3 3" />
          </svg>
          <input
            ref={searchRef}
            name="q"
            placeholder="Search CRM…"
            aria-label="Search CRM"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
          />
          <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted lg:inline-block">
            ⌘K
          </kbd>
        </form>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setAskOpen(true)}
            className="flex items-center gap-1.5 rounded-control border border-border px-2.5 py-1.5 text-sm font-medium text-ink hover:bg-page"
          >
            <span aria-hidden className="text-accent">
              ✦
            </span>{" "}
            Ask CRM
          </button>

          <details className="relative [&[open]>summary]:bg-page">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-control bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-hover">
              <span aria-hidden>+</span> Create
            </summary>
            <div className={menu}>
              {CREATE_ITEMS.map((c) => (
                <Link key={c.label} href={c.href} className={menuItem} data-guest-block>
                  {c.label}
                </Link>
              ))}
            </div>
          </details>

          <details className="relative [&[open]>summary]:bg-page">
            <summary aria-label="Help" className="grid size-9 cursor-pointer list-none place-items-center rounded-control text-muted hover:bg-page hover:text-ink">
              <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <circle cx="8" cy="8" r="6.25" />
                <path d="M6.2 6.2a1.8 1.8 0 1 1 2.6 1.6c-.5.3-.8.6-.8 1.1v.3M8 11.6h.01" />
              </svg>
            </summary>
            <div className={menu}>
              <Link href="/search" className={menuItem}>Search (⌘K)</Link>
              <Link href="/dashboard" className={menuItem}>Dashboard</Link>
              <Link href="/audit" className={menuItem}>Audit trail</Link>
            </div>
          </details>

          <Link href="/dashboard" aria-label="Notifications and attention" className="grid size-9 place-items-center rounded-control text-muted hover:bg-page hover:text-ink">
            <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M4 6.5a4 4 0 1 1 8 0c0 3 1 4 1 4H3s1-1 1-4zM6.5 13a1.5 1.5 0 0 0 3 0" />
            </svg>
          </Link>

          <details className="relative [&[open]>summary]:bg-page">
            <summary aria-label="User menu" className="grid size-9 cursor-pointer list-none place-items-center rounded-full bg-primary text-xs font-semibold text-white">
              {initials}
            </summary>
            <div className={menu}>
              <div className="truncate px-3 py-2 text-xs text-muted">
                {email ?? "Guest (demo — read-only)"}
              </div>
              <div className="my-1 border-t border-border" />
              {email ? (
                <form action={signOutAction}>
                  <button type="submit" className={`${menuItem} w-full text-left`}>
                    Sign out
                  </button>
                </form>
              ) : (
                <Link href="/guest/exit" className={menuItem}>
                  Exit demo
                </Link>
              )}
            </div>
          </details>
        </div>
      </header>

      {askOpen && (
        <div className="fixed inset-0 z-30">
          <button
            type="button"
            aria-label="Close Ask CRM"
            onClick={() => setAskOpen(false)}
            className="absolute inset-0 bg-ink/20"
          />
          <aside
            role="dialog"
            aria-label="Ask CRM"
            className="absolute right-0 top-0 flex h-full w-[420px] max-w-full flex-col border-l border-border bg-surface p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span aria-hidden className="text-accent">✦</span>
                <span className="text-sm font-semibold">Ask CRM</span>
              </div>
              <button
                type="button"
                onClick={() => setAskOpen(false)}
                aria-label="Close"
                className="grid size-8 place-items-center rounded-control text-muted hover:bg-page hover:text-ink"
              >
                ✕
              </button>
            </div>

            <form
              className="mt-3 flex items-center gap-2 rounded-control border border-border bg-page px-3 py-2"
              onSubmit={(e) => {
                e.preventDefault();
                submit(q);
              }}
            >
              <input
                ref={askInputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Ask anything about your CRM…"
                aria-label="Ask anything about your CRM"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
              />
              <button type="submit" aria-label="Ask" className="text-muted hover:text-ink">
                →
              </button>
            </form>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {SUGGESTED.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => submit(s)}
                  className="rounded-full border border-border px-2.5 py-1 text-xs text-muted hover:bg-page hover:text-ink"
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
              {busy && (
                <div className="space-y-2">
                  <div className="h-3 w-3/4 animate-pulse rounded bg-border" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-border" />
                </div>
              )}
              {result && (
                <div className="rounded-card border border-border bg-page/60 p-3">
                  {result.answered ? (
                    <>
                      <p className="text-sm font-medium">{result.answer}</p>
                      {result.rows.length > 0 && (
                        <ul className="mt-2 space-y-1 text-sm text-muted">
                          {result.rows.map((r, i) => (
                            <li key={i}>
                              {r.href ? (
                                <Link href={r.href} className="hover:text-primary">
                                  {r.label}
                                </Link>
                              ) : (
                                r.label
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-warning">{result.message}</p>
                  )}
                </div>
              )}
              {!busy && !result && (
                <p className="text-sm text-muted">
                  Ask about orders, requirements or payments. Answers come only
                  from stored data.
                </p>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
