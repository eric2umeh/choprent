import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MOCK_TENANT_LEDGER } from "@/lib/mock/data";
import { formatNaira } from "@/lib/auth/roles";
import { Copy, Upload } from "lucide-react";

const balance = MOCK_TENANT_LEDGER.reduce((sum, l) => sum + l.amount, 0);

export default async function TenantHomePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  return (
    <div className="space-y-0">
      <div className="border-b border-green-200 bg-green-50 px-3 py-3">
        <p className="text-label normal-case text-green-800">Balance due</p>
        <p className="text-xl font-bold text-foreground">{formatNaira(balance)}</p>
        <p className="text-cell-muted">Shop 14 · H2 2025</p>
      </div>

      <Card className="rounded-none border-x-0 border-t-0 shadow-none">
        <p className="text-label normal-case">Pay to shop account</p>
        <p className="mt-1 font-mono text-lg font-bold tracking-wide text-foreground">
          9876543210
        </p>
        <p className="text-cell-muted">GTBank · Chidi Traders Ltd</p>
        <button
          type="button"
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-green-700"
        >
          <Copy className="h-3.5 w-3.5" />
          Copy account number
        </button>
      </Card>

      <div className="grid grid-cols-2 gap-2 border-b border-border bg-white px-3 py-3">
        <Link
          href={`/t/${orgSlug}/pay`}
          className="btn-primary flex flex-col items-center gap-1.5 py-3 text-center text-xs"
        >
          <Upload className="h-4 w-4" />
          Upload receipt
        </Link>
        <Link
          href={`/t/${orgSlug}/ledger`}
          className="btn-ghost flex flex-col items-center gap-1.5 py-3 text-center text-xs"
        >
          View ledger
        </Link>
      </div>

      <div className="bg-white px-3 py-3">
        <h2 className="text-sm font-semibold text-foreground">Recent activity</h2>
        <div className="mt-2 divide-y divide-border">
          <div className="flex justify-between py-2 text-sm">
            <span className="text-cell-muted">Mar payment verified</span>
            <span className="font-medium text-green-700">
              −{formatNaira(690000)}
            </span>
          </div>
          <div className="flex justify-between py-2 text-sm">
            <span className="text-cell-muted">Annual charges</span>
            <span className="font-medium text-foreground">
              {formatNaira(1370000)}
            </span>
          </div>
        </div>
        <Badge variant="warning" className="mt-2">
          1 receipt pending review
        </Badge>
      </div>
    </div>
  );
}
