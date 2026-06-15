import Link from "next/link";
import type { ReactNode } from "react";

export function SectionHeader({
  title,
  href,
  linkLabel = "View all",
}: {
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-section-title">{title}</h2>
      {href && (
        <Link href={href} className="text-section-link hover:underline">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

export function ListRow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`list-row ${className}`}>{children}</div>;
}
