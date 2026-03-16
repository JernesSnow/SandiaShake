export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { google } from "googleapis";
import { Readable } from "stream";
import oauth2Client, { ensureDriveCredentials } from "@/lib/google-drive/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServer } from "@/lib/supabase/server";

/* --------------------------------
   POST /api/google-drive/upload
-------------------------------- */

export async function POST(req: Request) {
  try {

    /* -----------------------------
       Ensure OAuth credentials
    ------------------------------ */

    const ok = await ensureDriveCredentials();

    if (!ok) {
      return NextResponse.json(
        { error: "Drive credentials not configured" },
        { status: 400 }
      );
    }

    /* -----------------------------
       Resolve current user
    ------------------------------ */

    const supabase = await createSupabaseServer();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const admin = createSupabaseAdmin();

    const { data: dbUser, error: userError } = await admin
      .from("usuarios")
      .select("id_usuario")
      .eq("auth_user_id", user.id)
      .eq("estado", "ACTIVO")
      .maybeSingle();

    if (userError || !dbUser?.id_usuario) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 401 }
      );
    }

    const currentUserId = dbUser.id_usuario;

    /* -----------------------------
       Parse FormData
    ------------------------------ */

    const form = await req.formData();

    const file = form.get("file") as File | null;
    const folderId = form.get("folderId") as string | null;
    const tareaId = form.get("tareaId") as string | null;

    if (!file || !folderId || !tareaId) {
      return NextResponse.json(
        {
          error: "Missing file, tareaId or folderId",
          debug: { file: !!file, folderId, tareaId }
        },
        { status: 400 }
      );
    }

    /* -----------------------------
       Prepare Drive upload
    ------------------------------ */

    const buffer = Buffer.from(await file.arrayBuffer());
    const stream = Readable.from(buffer);

    const drive = google.drive({
      version: "v3",
      auth: oauth2Client,
    });

    /* -----------------------------
       Upload file
    ------------------------------ */

    const upload = await drive.files.create({
      requestBody: {
        name: file.name,
        parents: [folderId],
      },
      media: {
        mimeType: file.type || "application/octet-stream",
        body: stream,
      },
      fields: "id,name,mimeType,size",
    });

    const driveFile = upload.data;

    if (!driveFile.id) {
      throw new Error("Drive upload failed");
    }

    /* -----------------------------
       Determine next version
    ------------------------------ */

    const { data: last } = await admin
      .from("entregables")
      .select("version_num")
      .eq("id_tarea", Number(tareaId))
      .order("version_num", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = (last?.version_num ?? 0) + 1;

    /* -----------------------------
       Insert deliverable
    ------------------------------ */

    const { data: entregable, error } = await admin
      .from("entregables")
      .insert({
        id_tarea: Number(tareaId),
        version_num: nextVersion,
        drive_folder_url: `https://drive.google.com/drive/folders/${folderId}`,
        drive_file_id: driveFile.id,
        drive_file_name: driveFile.name,
        drive_mime_type: driveFile.mimeType,
        drive_file_size: driveFile.size ? Number(driveFile.size) : null,
        estado_aprobacion: "PENDIENTE",
        creado_por: currentUserId,
        estado: "ACTIVO",
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error("Entregable insert error:", error);
      throw new Error("File uploaded but entregable record failed");
    }

    /* -----------------------------
       Return response
    ------------------------------ */

    return NextResponse.json({
      ok: true,
      fileId: driveFile.id,
      entregableId: entregable.id_entregable,
      version: entregable.version_num,
      estado: entregable.estado_aprobacion,
    });

  } catch (e: any) {

    console.error("UPLOAD ERROR:", e);

    return NextResponse.json(
      { error: e?.message ?? "Upload failed" },
      { status: 500 }
    );
  }
}