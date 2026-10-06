export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-[800px] space-y-4">
      <div>
        <span className="label">Utility</span>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight">Settings</h1>
      </div>
      <div className="rounded-card border border-border bg-surface p-6">
        <p className="text-sm font-medium">Configuration</p>
        <p className="mt-1 text-sm text-muted">
          Roles, approvals and alert thresholds will live here. Nothing is
          configurable yet — this area is reserved so the navigation reflects the
          intended structure.
        </p>
      </div>
    </div>
  );
}
