import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { PROPERTY_TYPES } from "@/lib/mock/data";

export default async function NewUnitPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ role?: string }>;
}) {
  const { orgSlug } = await params;
  const { role = "owner" } = await searchParams;
  const q = role === "owner" ? "" : `?role=${role}`;

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Add unit"
        description="Landlord only — create a new billable unit in the plaza"
      />

      <Card>
        <form className="space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
              Unit code
            </label>
            <input
              className="input-field"
              placeholder='e.g. 14, 14/16, Flat 3B'
            />
            <p className="mt-1 text-xs text-muted">
              Supports composite numbers like 14/16 or 14 &amp; 16
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
              Property type
            </label>
            <select className="input-field">
              {PROPERTY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
              Base annual rent (₦)
            </label>
            <input className="input-field" type="number" placeholder="1200000" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-primary flex-1 py-3">
              Save unit (mock)
            </button>
            <Link
              href={`/d/${orgSlug}/units${q}`}
              className="btn-ghost flex-1 py-3 text-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
