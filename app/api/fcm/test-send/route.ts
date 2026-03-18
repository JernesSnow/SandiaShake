import { NextRequest, NextResponse } from "next/server";
import { GoogleAuth } from "google-auth-library";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function getAccessToken() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Faltan variables FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY");
  }

  const auth = new GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
  });

  const accessToken = await auth.getAccessToken();
  if (!accessToken) throw new Error("No se pudo obtener access token");

  return { accessToken, projectId };
}

export async function POST(_req: NextRequest) {
  const supabase = await createSupabaseServer();
  const admin = createSupabaseAdmin();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return jsonError("No auth", 401);

  const { data: u } = await admin
    .from("usuarios")
    .select("id_usuario")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!u) return jsonError("Usuario no encontrado", 404);

  const { data: tokenRows, error: tokenErr } = await admin
  .from("fcm_tokens")
  .select("token")
  .eq("id_usuario", u.id_usuario)
  .eq("activo", true);

if (tokenErr) return jsonError(tokenErr.message, 500);
if (!tokenRows?.length) return jsonError("No hay tokens FCM activos para este usuario", 404);

  try {
    const { accessToken, projectId } = await getAccessToken();

    const results = [];

for (const row of tokenRows) {
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token: row.token,
          notification: {
            title: "SandiaShake",
            body: "Cuenta con una factura pendiente por pagar",
          },
          data: {
            url: "/facturacion/mis-facturas",
          },
          webpush: {
            notification: {
              icon: "/mock-logo-sandia-con-chole.png",
            },
          },
        },
      }),
    }
  );

  const data = await res.json();
  results.push({
    token: row.token,
    ok: res.ok,
    data,
  });
}

return NextResponse.json({ ok: true, results });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Error enviando push", 500);
  }
}