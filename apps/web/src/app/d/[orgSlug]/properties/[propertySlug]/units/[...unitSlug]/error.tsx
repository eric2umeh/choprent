"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

export default function UnitDetailError({
  reset,
}: {
  reset: () => void;
}) {
  const params = useParams<{ orgSlug?: string; propertySlug?: string }>();
  const backHref =
    params.orgSlug && params.propertySlug
      ? `/d/${params.orgSlug}/properties/${params.propertySlug}`
      : "/";

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-lg font-semibold text-foreground">This page couldn&apos;t load</h1>
      <p className="max-w-md text-sm text-muted">
        The unit link may be outdated. Open the unit again from the Properties list.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" className="btn-primary px-4 py-2" onClick={() => reset()}>
          Try again
        </button>
        <Link href={backHref} className="btn-ghost px-4 py-2">
          Back to property
        </Link>
      </div>
    </div>
  );
}
