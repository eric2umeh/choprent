import { createAdminClient } from "@/lib/supabase/admin";
import { actorLabel, resolveActorLabels } from "@/lib/data/audit-actors";

export type DocumentFolderItem = {
  id: string;
  name: string;
  leaseId: string;
  unitId: string | null;
  documentCount: number;
  createdAt: string;
  createdByName: string | null;
};

export async function listDocumentFoldersForLease(
  orgId: string,
  leaseId: string
): Promise<DocumentFolderItem[]> {
  try {
    const admin = createAdminClient();
    const { data: folders, error } = await admin
      .from("document_folders")
      .select("id, name, lease_id, unit_id, created_at, created_by")
      .eq("organization_id", orgId)
      .eq("lease_id", leaseId)
      .order("name", { ascending: true });

    if (error || !folders?.length) return [];

    const folderIds = folders.map((f) => f.id);
    const { data: docs } = await admin
      .from("management_documents")
      .select("folder_id")
      .eq("organization_id", orgId)
      .in("folder_id", folderIds);

    const countByFolder = new Map<string, number>();
    for (const row of docs ?? []) {
      if (!row.folder_id) continue;
      countByFolder.set(row.folder_id, (countByFolder.get(row.folder_id) ?? 0) + 1);
    }

    const actors = await resolveActorLabels(
      orgId,
      folders.map((f) => f.created_by)
    );

    return folders.map((f) => ({
      id: f.id,
      name: f.name,
      leaseId: f.lease_id,
      unitId: f.unit_id,
      documentCount: countByFolder.get(f.id) ?? 0,
      createdAt: f.created_at,
      createdByName: actorLabel(actors, f.created_by),
    }));
  } catch {
    return [];
  }
}
