import Link from "next/link";

type LogoProps = {
  variant?: "light" | "dark";
  href?: string;
};

export function Logo({ variant = "dark", href = "/" }: LogoProps) {
  const text = variant === "light" ? "text-white" : "text-foreground";

  return (
    <Link href={href} className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500 text-sm font-bold text-green-950 shadow-sm shadow-green-500/30">
        C
      </span>
      <span className={`text-lg font-semibold tracking-tight ${text}`}>
        ChopRent
      </span>
    </Link>
  );
}
