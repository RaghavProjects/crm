import Link from "next/link";
import { createOemAction } from "./actions";

const input =
  "w-full rounded-control border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary";
const label = "block text-xs font-medium text-muted";

export function OemForm() {
  return (
    <form action={createOemAction} className="space-y-6">
      <section className="rounded-card border border-border bg-surface p-4 md:p-6">
        <h2 className="text-sm font-semibold">OEM identity</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="name">
              OEM name *
            </label>
            <input id="name" name="name" required className={input} />
          </div>
          <div>
            <label className={label} htmlFor="location">
              Location
            </label>
            <input id="location" name="location" className={input} />
          </div>
          <div>
            <label className={label} htmlFor="spoc">
              Contact (SPOC)
            </label>
            <input id="spoc" name="spoc" className={input} />
          </div>
          <div>
            <label className={label} htmlFor="email">
              Email
            </label>
            <input id="email" name="email" type="email" className={input} />
          </div>
          <div>
            <label className={label} htmlFor="mobile">
              Mobile
            </label>
            <input id="mobile" name="mobile" className={input} />
          </div>
          <div>
            <label className={label} htmlFor="vendor_code">
              Vendor code
            </label>
            <input id="vendor_code" name="vendor_code" className={input} />
          </div>
          <div>
            <label className={label} htmlFor="gst_no">
              GST number
            </label>
            <input id="gst_no" name="gst_no" className={input} />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input id="approved" name="approved" type="checkbox" />
              Approved supplier
            </label>
          </div>
        </div>
      </section>

      <section className="rounded-card border border-border bg-surface p-4 md:p-6">
        <h2 className="text-sm font-semibold">Capability</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className={label} htmlFor="products">
              Products supplied
            </label>
            <input id="products" name="products" className={input} />
          </div>
          <div>
            <label className={label} htmlFor="capabilities">
              Capabilities
            </label>
            <textarea
              id="capabilities"
              name="capabilities"
              rows={2}
              className={input}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="lead_time_days">
                Typical lead time (days)
              </label>
              <input
                id="lead_time_days"
                name="lead_time_days"
                inputMode="numeric"
                className={input}
              />
            </div>
            <div>
              <label className={label} htmlFor="commission_pct">
                Commission %
              </label>
              <input
                id="commission_pct"
                name="commission_pct"
                inputMode="decimal"
                className={input}
              />
            </div>
          </div>
          <div>
            <label className={label} htmlFor="notes">
              Notes
            </label>
            <textarea id="notes" name="notes" rows={2} className={input} />
          </div>
        </div>
      </section>

      <div className="flex gap-3">
        <button
          type="submit"
          className="rounded-control bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Save OEM
        </button>
        <Link
          href="/oems"
          className="rounded-control border border-border px-4 py-2 text-sm font-medium hover:bg-page"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
