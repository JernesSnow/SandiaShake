import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import oauth2Client, { ensureDriveCredentials } from "@/lib/google-drive/auth";

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name");

  if (!name) {
    return NextResponse.json({ error: "Falta el parámetro name." }, { status: 400 });
  }

  await ensureDriveCredentials();

  if (!oauth2Client.credentials?.access_token) {
    return NextResponse.json(
      { error: "No hay tokens de OAuth configurados. Conecta Google Drive primero." },
      { status: 401 }
    );
  }

  try {
    const drive = google.drive({ version: "v3", auth: oauth2Client });

    const res = await drive.files.list({
      q: `name = '${name.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "files(id, name)",
      pageSize: 1,
    });

    const folder = res.data.files?.[0];

    if (!folder) {
      return NextResponse.json({ error: `No se encontró la carpeta "${name}".` }, { status: 404 });
    }

    return NextResponse.json({ id: folder.id, name: folder.name });
  } catch (err: any) {
    const message = err?.errors?.[0]?.message ?? err?.message ?? "Error buscando carpeta.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
