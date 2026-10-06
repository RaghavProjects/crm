import { signOutAction } from "@/app/(app)/actions";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="rounded-control border border-border px-3 py-1.5 text-sm font-medium text-muted hover:bg-page hover:text-ink"
      >
        Sign out
      </button>
    </form>
  );
}
