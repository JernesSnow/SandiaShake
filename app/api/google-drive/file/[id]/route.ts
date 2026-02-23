import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import oauth2Client, { ensureDriveCredentials } from "@/lib/google-drive/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: fileId } = await params;

  await ensureDriveCredentials();

  if (!oauth2Client.credentials?.access_token) {
    return NextResponse.json(
      { error: "No hay tokens de OAuth configurados." },
      { status: 401 }
    );
  }

  try {
    const drive = google.drive({ version: "v3", auth: oauth2Client });

    // Get file metadata for Content-Type
    const meta = await drive.files.get({
      fileId,
      fields: "mimeType, name, size",
    });

    const mimeType = meta.data.mimeType ?? "application/octet-stream";

    // Stream the file content
    const res = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "stream" }
    );

    const stream = res.data as unknown as NodeJS.ReadableStream;

    // Convert Node readable stream to a web ReadableStream
    const webStream = new ReadableStream({
      start(controller) {
        stream.on("data", (chunk: Buffer) => controller.enqueue(chunk));
        stream.on("end", () => controller.close());
        stream.on("error", (err: Error) => controller.error(err));
      },
    });

    return new Response(webStream, {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err: any) {
    const message =
      err?.errors?.[0]?.message ?? err?.message ?? "Error al obtener archivo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
