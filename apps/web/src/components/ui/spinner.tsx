import { Loader2 } from "lucide-react";

const sizes = {
  sm: "size-3.5",
  md: "size-5",
  lg: "size-8",
} as const;

export function Spinner({
  size = "md",
  className = "",
}: {
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <Loader2
      className={`animate-spin text-green-700 ${sizes[size]} ${className}`}
      aria-hidden
    />
  );
}
