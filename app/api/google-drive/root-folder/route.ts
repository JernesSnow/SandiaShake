import { NextResponse } from "next/server";
import { google } from "googleapis";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import oauth2Client, { ensureDriveCredentials } from "@/lib/google-drive/auth";

export async function GET() {
  await ensureDriveCredentials();

  if (!oauth2Client.credentials?.access_token) {
    return NextResponse.json(
      { error: "No hay tokens de OAuth configurados." },
      { status: 401 }
    );
  }

  try {
    const supabase = createSupabaseAdmin();

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

    // Find SandiaConChile inside root
    const res = await drive.files.list({
      q:
        `name='SandiaConChile' ` +
        `and '${conn.root_folder_id}' in parents ` +
        `and mimeType='application/vnd.google-apps.folder' ` +
        `and trashed=false`,
      fields: "files(id, name)",
      spaces: "drive",
      pageSize: 1,
    });

    const folder = res.data.files?.[0];

    if (!folder) {
      return NextResponse.json(
        { error: 'No se encontró la carpeta "SandiaConChile".' },
        { status: 404 }
      );
    }

    return NextResponse.json({ id: folder.id, name: folder.name }, { status: 200 });
  } catch (err: any) {
    const message = err?.errors?.[0]?.message ?? err?.message ?? "Error buscando carpeta raíz.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
