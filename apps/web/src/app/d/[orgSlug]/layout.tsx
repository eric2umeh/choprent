import { Suspense } from "react";
import { DashboardShellClient } from "@/components/layout/dashboard-shell-client";
import { MOCK_ORG } from "@/lib/mock/data";
import { notFound } from "next/navigation";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  if (orgSlug !== MOCK_ORG.slug) notFound();

  return (
    <Suspense fallback={<div className="min-h-screen bg-surface-subtle" />}>
      <DashboardShellClient orgSlug={orgSlug}>{children}</DashboardShellClient>
    </Suspense>
  );
}
