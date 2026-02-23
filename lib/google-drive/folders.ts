import { google } from "googleapis";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import oauth2Client, { ensureDriveCredentials } from "@/lib/google-drive/auth";

type DriveClient = ReturnType<typeof google.drive>;

/**
 * Finds an existing subfolder by name inside a parent, or creates it if missing.
 */
async function findOrCreateFolder(
  drive: DriveClient,
  folderName: string,
  parentId: string
): Promise<string> {
  // Search for existing folder
  const res = await drive.files.list({
    q: `name='${folderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id)",
    spaces: "drive",
  });

  if (res.data.files?.length && res.data.files[0].id) {
    return res.data.files[0].id;
  }

  // Create if not found
  const created = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
  });

  console.log(`[Drive] Created "${folderName}" folder → ${created.data.id}`);
  return created.data.id!;
}

/**
 * Creates a Google Drive folder for an organization inside the "SandiaConChile" root folder.
 * Also saves the reference in `google_drive_org_folders`.
 */
export async function createOrgDriveFolder(
  orgName: string,
  orgId: number
): Promise<string | null> {
  const ok = await ensureDriveCredentials();
  if (!ok) {
    console.warn("[Drive] No credentials available — skipping folder creation");
    return null;
  }

  const supabase = createSupabaseAdmin();

  // Get root folder ID from google_drive_connection
  const { data: conn } = await supabase
    .from("google_drive_connection")
    .select("root_folder_id")
    .eq("is_active", true)
    .eq("estado", "ACTIVO")
    .limit(1)
    .single();

  if (!conn?.root_folder_id) {
    console.warn("[Drive] No root_folder_id configured — skipping folder creation");
    return null;
  }

  const drive = google.drive({ version: "v3", auth: oauth2Client });

  // Find or create "SandiaConChile" folder inside root
  const sandiaConChileId = await findOrCreateFolder(
    drive,
    "SandiaConChile",
    conn.root_folder_id
  );

  // Create org subfolder inside SandiaConChile
  const folder = await drive.files.create({
    requestBody: {
      name: orgName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [sandiaConChileId],
    },
    fields: "id, name, webViewLink",
  });

  const folderId = folder.data.id!;
  const folderUrl = folder.data.webViewLink ?? "";

  // Save reference in DB
  await supabase.from("google_drive_org_folders").insert({
    id_organizacion: orgId,
    folder_id: folderId,
    folder_name: orgName,
    folder_url: folderUrl,
  });

  console.log(`[Drive] Created org folder "${orgName}" → ${folderId}`);
  return folderId;
}
