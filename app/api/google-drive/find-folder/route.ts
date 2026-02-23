import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import oauth2Client, { ensureDriveCredentials } from "@/lib/google-drive/auth";

async function findFolderByNameInsideParent(
  drive: ReturnType<typeof google.drive>,
  folderName: string,
  parentId: string
) {
  const safeName = folderName.replace(/'/g, "\\'");

  const res = await drive.files.list({
    q:
      `name='${safeName}' ` +
      `and '${parentId}' in parents ` +
      `and mimeType='application/vnd.google-apps.folder' ` +
      `and trashed=false`,
    fields: "files(id, name, webViewLink)",
    spaces: "drive",
    pageSize: 1,
  });

  return res.data.files?.[0] ?? null;
}

export async function GET(req: NextRequest) {
  const orgName = req.nextUrl.searchParams.get("name");

  if (!orgName) {
    return NextResponse.json(
      { error: "Falta el parámetro name." },
      { status: 400 }
    );
  }

  await ensureDriveCredentials();

  if (!oauth2Client.credentials?.access_token) {
    return NextResponse.json(
      { error: "No hay tokens de OAuth configurados." },
      { status: 401 }
    );
  }

  try {
    const supabase = createSupabaseAdmin();

    // 1️⃣ Get root folder from DB
    const { data: conn } = await supabase
      .from("google_drive_connection")
      .select("root_folder_id")
      .eq("is_active", true)
      .eq("estado", "ACTIVO")
      .limit(1)
      .single();

    if (!conn?.root_folder_id) {
      return NextResponse.json(
        { error: "No hay root_folder_id configurado." },
        { status: 500 }
      );
    }

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    // 2️⃣ Find SandiaConChile inside root
    const sandiaFolder = await findFolderByNameInsideParent(
      drive,
      "SandiaConChile",
      conn.root_folder_id
    );

    if (!sandiaFolder) {
      return NextResponse.json(
        { error: 'No existe la carpeta "SandiaConChile".' },
        { status: 404 }
      );
    }

    // 3️⃣ Find organization folder inside SandiaConChile
    const orgFolder = await findFolderByNameInsideParent(
      drive,
      orgName,
      sandiaFolder.id!
    );

    if (!orgFolder) {
      return NextResponse.json(
        { error: `No se encontró la carpeta "${orgName}".` },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        id: orgFolder.id,
        name: orgFolder.name,
        url: orgFolder.webViewLink,
      },
      { status: 200 }
    );
  } catch (err: any) {
    const message =
      err?.errors?.[0]?.message ??
      err?.message ??
      "Error buscando carpeta.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
