import { redirect } from "next/navigation";
import { requireStaffContext } from "@/lib/auth/session";

export const metadata = { title: "Documents" };

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  await requireStaffContext(orgSlug);
  redirect(`/d/${orgSlug}/tenants`);
}
