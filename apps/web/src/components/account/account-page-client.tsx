"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabPanel } from "@/components/ui/tabs";
import { SettlementAccountsPanel } from "@/components/account/settlement-accounts-panel";
import { DvaPanel } from "@/components/account/dva-panel";
import type { SettlementAccountItem } from "@/lib/data/settlement-accounts";
import type { PropertySummary } from "@/lib/data/property-types";

const TABS = [
  { id: "settlement", label: "Settlement accounts" },
  { id: "dva", label: "Paystack DVA" },
];

export function AccountPageClient({
  orgSlug,
  accounts,
  properties,
  canManage,
}: {
  orgSlug: string;
  accounts: SettlementAccountItem[];
  properties: PropertySummary[];
  canManage: boolean;
}) {
  const [tab, setTab] = useState("settlement");

  return (
    <div>
      <PageHeader
        title="Account"
        description="Bank settlement accounts and Paystack dedicated virtual accounts"
      />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === "settlement" && (
        <TabPanel>
          <SettlementAccountsPanel
            orgSlug={orgSlug}
            accounts={accounts}
            properties={properties}
            canManage={canManage}
          />
        </TabPanel>
      )}
      {tab === "dva" && (
        <TabPanel>
          <DvaPanel />
        </TabPanel>
      )}
    </div>
  );
}
