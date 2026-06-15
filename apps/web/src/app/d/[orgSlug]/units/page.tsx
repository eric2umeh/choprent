import { redirect } from "next/navigation";

export default async function UnitsRedirect({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  redirect(`/d/${orgSlug}/properties`);
}
