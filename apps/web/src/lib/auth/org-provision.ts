import { slugify } from "@/lib/utils/slug";
import type { AuthUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

export { slugify } from "@/lib/utils/slug";

export function orgSlugCandidate(user: AuthUser): string {
  const fromEmail = user.email?.split("@")[0] ?? "";
  const fromName = user.displayName.replace(/\s+/g, "-");
  return slugify(fromEmail || fromName || user.id.slice(0, 8));
}

export function orgDisplayName(user: AuthUser): string {
  if (user.displayName && user.displayName !== "User") {
    const first = user.displayName.split(/\s+/)[0];
    return `${first}'s properties`;
  }
  const prefix = user.email?.split("@")[0] ?? "my";
  return `${prefix.charAt(0).toUpperCase()}${prefix.slice(1)} properties`;
}

async function uniqueOrgSlug(
  admin: ReturnType<typeof createAdminClient>,
  base: string
): Promise<string> {
  let slug = base;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const { data } = await admin
      .from("organizations")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) return slug;
    slug = `${base}-${attempt + 1}`;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

/** Create a fresh organization and owner membership for a new landlord. */
export async function provisionLandlordOrganization(user: AuthUser) {
  const admin = createAdminClient();
  const slug = await uniqueOrgSlug(admin, orgSlugCandidate(user));
  const name = orgDisplayName(user);

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({
      name,
      slug,
      settings: {
        payments: { dva_enabled: false, fee_bearer: "undecided" },
      },
    })
    .select("id, slug")
    .single();

  if (orgError || !org) {
    throw new Error(orgError?.message ?? "Could not create your organization.");
  }

  const { error: memberError } = await admin.from("memberships").insert({
    user_id: user.id,
    organization_id: org.id,
    role: "owner",
  });

  if (memberError) {
    throw new Error(memberError.message);
  }

  return org as { id: string; slug: string };
}
