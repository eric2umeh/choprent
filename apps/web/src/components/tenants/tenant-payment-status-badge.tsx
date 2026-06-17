"use client";

import { Badge } from "@/components/ui/badge";
import {
  tenantPaymentStatusBadgeVariant,
  tenantPaymentStatusLabel,
  type TenantPaymentStatus,
} from "@/lib/data/tenant-payment-status";

export function TenantPaymentStatusBadge({
  status,
}: {
  status: TenantPaymentStatus;
}) {
  return (
    <Badge variant={tenantPaymentStatusBadgeVariant(status)}>
      {tenantPaymentStatusLabel(status)}
    </Badge>
  );
}
