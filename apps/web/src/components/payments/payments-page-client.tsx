"use client";

import { useState } from "react";
import { Tabs, TabPanel } from "@/components/ui/tabs";
import { PaymentsList } from "@/components/payments/payments-list";
import { VerificationQueue } from "@/components/payments/verification-queue";
import type { PaymentListItem } from "@/lib/data/payments";

export function PaymentsPageClient({
  orgSlug,
  canVerify,
  isOwner,
  payments,
  units,
}: {
  orgSlug: string;
  canVerify: boolean;
  isOwner: boolean;
  payments: PaymentListItem[];
  units: { id: string; unitCode: string; tenantName?: string | null }[];
}) {
  const pendingCount = payments.filter((p) => p.status === "pending").length;
  const [tab, setTab] = useState(pendingCount > 0 ? "queue" : "all");

  const tabs = [
    {
      id: "queue",
      label:
        pendingCount > 0
          ? `Verification queue (${pendingCount})`
          : "Verification queue",
    },
    { id: "all", label: "All payments" },
  ];

  return (
    <>
      <Tabs tabs={tabs} active={tab} onChange={setTab} />
      <TabPanel className="px-3 py-4">
        {tab === "queue" ? (
          <VerificationQueue
            orgSlug={orgSlug}
            canVerify={canVerify}
            payments={payments}
          />
        ) : (
          <PaymentsList
            orgSlug={orgSlug}
            canVerify={canVerify}
            isOwner={isOwner}
            payments={payments}
            units={units}
          />
        )}
      </TabPanel>
    </>
  );
}
