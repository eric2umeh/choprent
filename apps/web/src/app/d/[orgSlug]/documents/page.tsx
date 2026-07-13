import { redirect } from "next/navigation";
import { requireStaffContext } from "@/lib/auth/session";

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  await requireStaffContext(orgSlug);
  redirect(`/d/${orgSlug}/tenants`);
}
