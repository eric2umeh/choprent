"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabPanel } from "@/components/ui/tabs";
import { SettlementAccountsPanel } from "@/components/account/settlement-accounts-panel";
import { DvaPanel } from "@/components/account/dva-panel";
import type { VirtualAccountRow } from "@/lib/paystack/provision-unit-dva";
import type { SettlementAccountItem } from "@/lib/settlement/format-account";
import type { PropertySummary } from "@/lib/data/property-types";

function buildTabs(paystackDvaEnabled: boolean) {
  const tabs = [{ id: "settlement", label: "Settlement accounts" }];
  if (paystackDvaEnabled) {
    tabs.push({ id: "dva", label: "Paystack DVA" });
  }
  return tabs;
}

export function AccountPageClient({
  orgSlug,
  accounts,
  properties,
  virtualAccounts,
  paystackConfigured,
  paystackDvaEnabled,
  canManage,
}: {
  orgSlug: string;
  accounts: SettlementAccountItem[];
  properties: PropertySummary[];
  virtualAccounts: VirtualAccountRow[];
  paystackConfigured: boolean;
  paystackDvaEnabled: boolean;
  canManage: boolean;
}) {
  const [tab, setTab] = useState("settlement");
  const tabs = buildTabs(paystackDvaEnabled);

  return (
    <div>
      <PageHeader
        title="Account"
        description={
          paystackDvaEnabled
            ? "Bank settlement accounts and Paystack dedicated virtual accounts"
            : "Bank settlement accounts for rent collection"
        }
      />
      {tabs.length > 1 ? (
        <Tabs tabs={tabs} active={tab} onChange={setTab} />
      ) : null}
      {(tabs.length === 1 || tab === "settlement") && (
        <TabPanel>
          <SettlementAccountsPanel
            orgSlug={orgSlug}
            accounts={accounts}
            properties={properties}
            canManage={canManage}
          />
        </TabPanel>
      )}
      {paystackDvaEnabled && tab === "dva" && (
        <TabPanel>
          <DvaPanel
            orgSlug={orgSlug}
            accounts={virtualAccounts}
            paystackConfigured={paystackConfigured}
          />
        </TabPanel>
      )}
    </div>
  );
}
