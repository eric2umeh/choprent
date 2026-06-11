import Link from "next/link";

type LogoProps = {
  href?: string;
};

export function Logo({ href = "/" }: LogoProps) {
  return (
    <Link href={href} className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500 text-sm font-bold text-white shadow-sm">
        C
      </span>
      <span className="text-lg font-semibold tracking-tight text-foreground">
        ChopRent
      </span>
    </Link>
  );
}
