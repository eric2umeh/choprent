import { Spinner } from "@/components/ui/spinner";

export function LoadingState({
  label = "Loading…",
  fullScreen = false,
  className = "",
}: {
  label?: string;
  fullScreen?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 text-cell-muted ${
        fullScreen ? "min-h-screen bg-surface-subtle" : "px-3 py-8"
      } ${className}`}
      role="status"
      aria-live="polite"
    >
      <Spinner size="lg" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
