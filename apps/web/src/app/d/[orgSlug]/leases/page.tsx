import { redirect } from "next/navigation";

export default async function LeasesRedirect({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  redirect(`/d/${orgSlug}/tenants`);
}
