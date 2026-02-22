import { google } from "googleapis";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import oauth2Client, { ensureDriveCredentials } from "@/lib/google-drive/auth";

type DriveClient = ReturnType<typeof google.drive>;

/**
 * Safely finds a subfolder inside a parent folder.
 * If not found, creates it.
 * Fully supports Shared Drives.
 */
async function findOrCreateFolder(
  drive: DriveClient,
  folderName: string,
  parentId: string
): Promise<string> {
  const safeName = String(folderName || "").trim();
  const escapedName = safeName.replace(/'/g, "\\'");

  try {
    // 🔍 First: search inside parent (shared drives supported)
    const res = await drive.files.list({
      q: `
        '${parentId}' in parents
        and mimeType='application/vnd.google-apps.folder'
        and trashed=false
      `,
      fields: "files(id,name)",
      spaces: "drive",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const existing = res.data.files?.find(
      (f) => f.name?.toLowerCase() === safeName.toLowerCase()
    );

    if (existing?.id) {
      return existing.id;
    }

    // 🆕 Create folder if not found
    const created = await drive.files.create({
      requestBody: {
        name: safeName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentId],
      },
      fields: "id",
      supportsAllDrives: true,
    });

    console.log(`[Drive] Created folder "${safeName}" → ${created.data.id}`);
    return created.data.id!;
  } catch (err: any) {
    console.error("[Drive] findOrCreateFolder error:", err?.message);
    throw err;
  }
}

/**
 * Creates a Google Drive folder for an organization
 * inside SandiaConChile → under configured root_folder_id
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

  try {
    // 🔎 Get active Drive connection
    const { data: conn } = await supabase
      .from("google_drive_connection")
      .select("root_folder_id")
      .eq("is_active", true)
      .eq("estado", "ACTIVO")
      .limit(1)
      .maybeSingle();

    if (!conn?.root_folder_id) {
      console.warn("[Drive] No root_folder_id configured");
      return null;
    }

    const drive = google.drive({
      version: "v3",
      auth: oauth2Client,
    });

    // 1️⃣ Ensure SandiaConChile exists inside root
    const sandiaFolderId = await findOrCreateFolder(
      drive,
      "SandiaConChile",
      conn.root_folder_id
    );

    // 2️⃣ Ensure org folder exists inside SandiaConChile
    const orgFolderId = await findOrCreateFolder(
      drive,
      orgName,
      sandiaFolderId
    );

    // 3️⃣ Get folder webViewLink
    const folderMeta = await drive.files.get({
      fileId: orgFolderId,
      fields: "id,name,webViewLink",
      supportsAllDrives: true,
    });

    const folderUrl = folderMeta.data.webViewLink ?? "";

    // 4️⃣ Save reference in DB (UPSERT safe)
    await supabase.from("google_drive_org_folders").upsert(
      {
        id_organizacion: orgId,
        folder_id: orgFolderId,
        folder_name: orgName,
        folder_url: folderUrl,
      },
      { onConflict: "id_organizacion" }
    );

    console.log(`[Drive] Org folder ready "${orgName}" → ${orgFolderId}`);

    return orgFolderId;
  } catch (err: any) {
    console.error("[Drive] createOrgDriveFolder error:", err?.message);
    return null;
  }
}
