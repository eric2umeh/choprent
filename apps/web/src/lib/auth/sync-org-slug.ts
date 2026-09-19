import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils/slug";

/** True when slug looks like an email local-part (e.g. eric2umeh), not a plaza name. */
export function looksLikeEmailLocalSlug(slug: string, email: string | null | undefined): boolean {
  const local = email?.split("@")[0]?.trim().toLowerCase();
  if (!local) return false;
  return slugify(local) === slugify(slug);
}

/**
 * If the workspace was named after signup but the URL still uses the email local-part,
 * rename the org slug to match the workspace / plaza name.
 */
export async function syncOrgSlugFromWorkspaceName(input: {
  orgId: string;
  orgName: string;
  currentSlug: string;
  ownerEmail: string | null | undefined;
}): Promise<string | null> {
  const desired = slugify(input.orgName);
  if (!desired || desired === "property") return null;
  if (desired === input.currentSlug) return null;
  if (!looksLikeEmailLocalSlug(input.currentSlug, input.ownerEmail)) return null;

  try {
    const admin = createAdminClient();
    const { data: taken } = await admin
      .from("organizations")
      .select("id")
      .eq("slug", desired)
      .neq("id", input.orgId)
      .maybeSingle();

    let nextSlug = desired;
    if (taken) {
      nextSlug = `${desired}-${input.orgId.slice(0, 4)}`;
    }

    const { error } = await admin
      .from("organizations")
      .update({ slug: nextSlug })
      .eq("id", input.orgId);

    if (error) return null;
    return nextSlug;
  } catch {
    return null;
  }
}
