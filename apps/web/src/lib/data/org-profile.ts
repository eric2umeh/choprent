import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type OrgBranding = {
  orgName: string;
  companyName: string | null;
  ownerDisplayName: string | null;
  logoPath: string | null;
};

export type OrgProfile = OrgBranding & {
  slug: string;
};

type OrgSettings = {
  company_name?: string;
  owner_display_name?: string;
  logo_path?: string;
};

function parseSettings(raw: unknown): OrgSettings {
  if (!raw || typeof raw !== "object") return {};
  return raw as OrgSettings;
}

export async function getOrgProfile(orgId: string): Promise<OrgProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("name, slug, settings")
    .eq("id", orgId)
    .maybeSingle();

  if (error || !data) {
    try {
      const admin = createAdminClient();
      const { data: adminRow } = await admin
        .from("organizations")
        .select("name, slug, settings")
        .eq("id", orgId)
        .maybeSingle();
      if (!adminRow) return null;
      const settings = parseSettings(adminRow.settings);
      return {
        orgName: adminRow.name,
        slug: adminRow.slug,
        companyName: settings.company_name ?? null,
        ownerDisplayName: settings.owner_display_name ?? null,
        logoPath: settings.logo_path ?? null,
      };
    } catch {
      return null;
    }
  }

  const settings = parseSettings(data.settings);
  return {
    orgName: data.name,
    slug: data.slug,
    companyName: settings.company_name ?? null,
    ownerDisplayName: settings.owner_display_name ?? null,
    logoPath: settings.logo_path ?? null,
  };
}

export async function getOrgBranding(orgId: string): Promise<OrgBranding | null> {
  const profile = await getOrgProfile(orgId);
  if (!profile) return null;
  return {
    orgName: profile.orgName,
    companyName: profile.companyName,
    ownerDisplayName: profile.ownerDisplayName,
    logoPath: profile.logoPath,
  };
}

export function displayOrgName(branding: OrgBranding): string {
  return branding.companyName || branding.ownerDisplayName || branding.orgName;
}
