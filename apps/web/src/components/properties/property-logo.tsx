import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

const sizes = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-16 w-16",
} as const;

const iconSizes = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
} as const;

export function PropertyLogo({
  url,
  name,
  size = "md",
  className,
}: {
  url?: string | null;
  name: string;
  size?: keyof typeof sizes;
  className?: string;
}) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={`${name} logo`}
        className={cn(
          sizes[size],
          "shrink-0 rounded-lg border border-border object-cover",
          className
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        sizes[size],
        "flex shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-700",
        className
      )}
      aria-hidden
    >
      <Building2 className={iconSizes[size]} />
    </span>
  );
}
