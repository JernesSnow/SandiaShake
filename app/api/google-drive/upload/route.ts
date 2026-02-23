export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { google } from "googleapis";
import { Readable } from "stream";
import oauth2Client, { ensureDriveCredentials } from "@/lib/google-drive/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const ok = await ensureDriveCredentials();
    if (!ok) {
      return NextResponse.json(
        { error: "Drive credentials not configured" },
        { status: 400 }
      );
    }

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
      .select("id_usuario, rol")
      .eq("auth_user_id", user.id)
      .eq("estado", "ACTIVO")
      .maybeSingle();

    if (userError || !dbUser?.id_usuario) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 401 }
      );
    }

    if (dbUser.rol === "CLIENTE") {
      return NextResponse.json(
        { error: "Clients cannot upload files" },
        { status: 403 }
      );
    }

    const currentUserId = dbUser.id_usuario;


    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folderId = formData.get("folderId") as string | null;
    const tareaId = formData.get("tareaId") as string | null;

    if (!file || !folderId || !tareaId) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          debug: {
            hasFile: Boolean(file),
            folderId,
            tareaId,
          },
        },
        { status: 400 }
      );
    }


    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const stream = Readable.from(buffer);

    const drive = google.drive({
      version: "v3",
      auth: oauth2Client,
    });


    const uploaded = await drive.files.create({
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

    const fileId = uploaded.data.id;

    if (!fileId) {
      throw new Error("Drive upload failed");
    }


    const { data: lastVersion } = await admin
      .from("entregables")
      .select("version_num")
      .eq("id_tarea", Number(tareaId))
      .order("version_num", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = lastVersion
      ? lastVersion.version_num + 1
      : 1;


    const { data: entregable, error } = await admin
      .from("entregables")
      .insert({
        id_tarea: Number(tareaId),
        version_num: nextVersion,
        drive_folder_url: `https://drive.google.com/drive/folders/${folderId}`,
        drive_file_id: fileId,
        drive_file_name: uploaded.data.name,
        drive_mime_type: uploaded.data.mimeType,
        drive_file_size: uploaded.data.size
          ? Number(uploaded.data.size)
          : null,
        estado_aprobacion: "PENDIENTE",
        creado_por: currentUserId,
      })
      .select()
      .single();

    if (error) {
      console.error("Entregable insert error:", error);
      throw new Error("File uploaded but entregable record failed");
    }

    return NextResponse.json({
      ok: true,
      fileId,
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