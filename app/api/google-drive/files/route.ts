import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import oauth2Client, { ensureDriveCredentials } from "@/lib/google-drive/auth";

export async function GET(req: NextRequest) {
  const folderId = req.nextUrl.searchParams.get("folderId");

  if (!folderId) {
    return NextResponse.json(
      { error: "Falta el parámetro folderId." },
      { status: 400 }
    );
  }

  await ensureDriveCredentials();

  if (!oauth2Client.credentials?.access_token) {
    return NextResponse.json(
      {
        error:
          "No hay tokens de OAuth configurados. Ve a Configuración y conecta Google Drive primero.",
      },
      { status: 401 }
    );
  }

  try {
    const drive = google.drive({ version: "v3", auth: oauth2Client });

    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "files(id, name, mimeType, size)",
      pageSize: 100,
      orderBy: "folder,name",
    });

    const files = (res.data.files ?? []).map((f) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      size: f.size ?? null,
    }));

    return NextResponse.json({ files });
  } catch (err: any) {
    const message =
      err?.errors?.[0]?.message ?? err?.message ?? "Error al listar archivos.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
