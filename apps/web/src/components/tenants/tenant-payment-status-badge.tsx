"use client";

import { Badge } from "@/components/ui/badge";
import {
  tenantPaymentStatusBadgeVariant,
  tenantPaymentStatusLabel,
  type TenantPaymentStatus,
} from "@/lib/data/tenant-payment-status";

export function TenantPaymentStatusBadge({
  status,
  className,
}: {
  status: TenantPaymentStatus;
  className?: string;
}) {
  return (
    <Badge
      variant={tenantPaymentStatusBadgeVariant(status)}
      className={className}
    >
      {tenantPaymentStatusLabel(status)}
    </Badge>
  );
}
