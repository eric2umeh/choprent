"use server";

import { revalidatePath } from "next/cache";
import { canManageDocumentFolders } from "@/lib/auth/roles";
import { requireStaffContext } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

export type FolderActionState = {
  error?: string;
  success?: boolean;
  folderId?: string;
};

function revalidateTenantPaths(orgSlug: string, leaseId: string) {
  revalidatePath(`/d/${orgSlug}/tenants/${leaseId}`);
  revalidatePath(`/d/${orgSlug}/tenants`);
}

function isRealDocumentId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    id
  );
}

export async function createDocumentFolder(
  orgSlug: string,
  leaseId: string,
  name: string
): Promise<FolderActionState> {
  const ctx = await requireStaffContext(orgSlug);
  if (!canManageDocumentFolders(ctx.role)) {
    return { error: "You don't have permission to create folders." };
  }

  const folderName = name.trim();
  if (!folderName) return { error: "Enter a folder name (e.g. 2026)." };
  if (folderName.length > 80) return { error: "Folder name is too long." };

  const admin = createAdminClient();
  const { data: lease, error: leaseError } = await admin
    .from("leases")
    .select("id, unit_id, units!inner(organization_id)")
    .eq("id", leaseId)
    .maybeSingle();

  if (leaseError || !lease) return { error: "Tenant lease not found." };

  const units = lease.units as
    | { organization_id: string }
    | { organization_id: string }[]
    | null;
  const orgFromUnit = Array.isArray(units)
    ? units[0]?.organization_id
    : units?.organization_id;
  if (orgFromUnit !== ctx.org.id) {
    return { error: "Tenant lease not found." };
  }

  const { data, error } = await admin
    .from("document_folders")
    .insert({
      organization_id: ctx.org.id,
      lease_id: leaseId,
      unit_id: lease.unit_id,
      name: folderName,
      created_by: ctx.user.id,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: `A folder named “${folderName}” already exists.` };
    }
    return { error: error.message };
  }

  revalidateTenantPaths(orgSlug, leaseId);
  return { success: true, folderId: data.id };
}

export async function renameDocumentFolder(
  orgSlug: string,
  folderId: string,
  name: string
): Promise<FolderActionState> {
  const ctx = await requireStaffContext(orgSlug);
  if (!canManageDocumentFolders(ctx.role)) {
    return { error: "You don't have permission to rename folders." };
  }

  const folderName = name.trim();
  if (!folderName) return { error: "Enter a folder name." };
  if (folderName.length > 80) return { error: "Folder name is too long." };

  const admin = createAdminClient();
  const { data: folder } = await admin
    .from("document_folders")
    .select("id, lease_id")
    .eq("id", folderId)
    .eq("organization_id", ctx.org.id)
    .maybeSingle();

  if (!folder) return { error: "Folder not found." };

  const { error } = await admin
    .from("document_folders")
    .update({ name: folderName })
    .eq("id", folderId)
    .eq("organization_id", ctx.org.id);

  if (error) {
    if (error.code === "23505") {
      return { error: `A folder named “${folderName}” already exists.` };
    }
    return { error: error.message };
  }

  revalidateTenantPaths(orgSlug, folder.lease_id);
  return { success: true, folderId };
}

export async function deleteDocumentFolder(
  orgSlug: string,
  folderId: string
): Promise<FolderActionState> {
  const ctx = await requireStaffContext(orgSlug);
  if (!canManageDocumentFolders(ctx.role)) {
    return { error: "You don't have permission to delete folders." };
  }

  const admin = createAdminClient();
  const { data: folder } = await admin
    .from("document_folders")
    .select("id, lease_id")
    .eq("id", folderId)
    .eq("organization_id", ctx.org.id)
    .maybeSingle();

  if (!folder) return { error: "Folder not found." };

  // Documents keep their files; folder_id is cleared via ON DELETE SET NULL.
  const { error } = await admin
    .from("document_folders")
    .delete()
    .eq("id", folderId)
    .eq("organization_id", ctx.org.id);

  if (error) return { error: error.message };

  revalidateTenantPaths(orgSlug, folder.lease_id);
  return { success: true };
}

export async function moveDocumentsToFolder(
  orgSlug: string,
  leaseId: string,
  documentIds: string[],
  folderId: string | null
): Promise<FolderActionState> {
  const ctx = await requireStaffContext(orgSlug);
  if (!canManageDocumentFolders(ctx.role)) {
    return { error: "You don't have permission to move documents." };
  }

  const ids = [...new Set(documentIds.filter(isRealDocumentId))];
  if (ids.length === 0) {
    return {
      error:
        "Only uploaded management documents can be filed. Payment/expense attachments stay in Documents.",
    };
  }

  const admin = createAdminClient();

  if (folderId) {
    const { data: folder } = await admin
      .from("document_folders")
      .select("id, lease_id")
      .eq("id", folderId)
      .eq("organization_id", ctx.org.id)
      .eq("lease_id", leaseId)
      .maybeSingle();
    if (!folder) return { error: "Folder not found." };
  }

  const { error } = await admin
    .from("management_documents")
    .update({ folder_id: folderId })
    .eq("organization_id", ctx.org.id)
    .in("id", ids);

  if (error) return { error: error.message };

  revalidateTenantPaths(orgSlug, leaseId);
  return { success: true };
}
