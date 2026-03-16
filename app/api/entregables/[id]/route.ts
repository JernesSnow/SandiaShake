import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { google } from "googleapis";
import oauth2Client, { ensureDriveCredentials } from "@/lib/google-drive/auth";

export async function DELETE(
  req: Request,
  ctx: { params: { id: string } }
) {
  try {

    const id = Number(ctx.params.id);

    const admin = createSupabaseAdmin();

    /* find file */

    const { data, error } = await admin
      .from("entregables")
      .select("drive_file_id")
      .eq("id_entregable", id)
      .single();

    if (error) throw error;

    /* delete from drive */

    await ensureDriveCredentials();

    const drive = google.drive({
      version: "v3",
      auth: oauth2Client
    });

    if (data?.drive_file_id) {
      await drive.files.delete({
        fileId: data.drive_file_id
      });
    }

    /* soft delete in DB */

    const { error: updateError } = await admin
      .from("entregables")
      .update({ estado: "ELIMINADO" })
      .eq("id_entregable", id);

    if (updateError) throw updateError;

    return NextResponse.json({ ok: true });

  } catch (err: any) {

    console.error(err);

    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}