export function getRejectionAlertEmailHTML(params: {
  colaboradorNombre?: string | null;
  tareaTitulo: string;
  organizacionNombre?: string | null;
}) {
  const nombre = params.colaboradorNombre?.trim() || "equipo";

  const organizacion = params.organizacionNombre?.trim()
    ? `
      <div style="margin:0 0 24px 0;padding:14px 18px;background:#1c1c1c;border:1px solid #2c2c2c;border-radius:12px;">
        <div style="font-size:13px;color:#9f9f9f;margin-bottom:4px;">Organización</div>
        <div style="font-size:16px;color:#ffffff;font-weight:600;">
          ${params.organizacionNombre}
        </div>
      </div>
    `
    : "";

  return `
  <!DOCTYPE html>
  <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Alerta de rechazo - Sandía Shake</title>
    </head>
    <body style="margin:0;padding:0;background-color:#0f0f10;font-family:Arial,Helvetica,sans-serif;color:#ffffff;">
      <div style="width:100%;background-color:#0f0f10;padding:32px 16px;">
        <div style="max-width:640px;margin:0 auto;">

          <!-- Header -->
          <div style="background:linear-gradient(135deg,#3f3f45 0%,#2a2a2f 100%);padding:28px 24px;border-radius:18px 18px 0 0;text-align:center;border-bottom:1px solid #5a5a5f;">
            <div style="font-size:34px;font-weight:700;color:#7ed957;line-height:1.2;">
              🍉 Sandía Shake
            </div>
            <div style="margin-top:8px;font-size:14px;color:#d6d6d6;letter-spacing:0.2px;">
              Mensaje automático del equipo de Sandía Con Chile
            </div>
          </div>

          <!-- Body -->
          <div style="background:#171718;padding:36px 28px;border-radius:0 0 18px 18px;box-shadow:0 10px 30px rgba(0,0,0,0.35);">
            <div style="display:inline-block;background:#2a2f1f;color:#c9f4a7;border:1px solid #4f6b2f;padding:8px 14px;border-radius:999px;font-size:13px;font-weight:700;margin-bottom:20px;">
              ALERTA DE RECHAZO
            </div>

            <h1 style="margin:0 0 18px 0;font-size:32px;line-height:1.2;color:#ffffff;">
              Hola ${nombre},
            </h1>

            <p style="margin:0 0 18px 0;color:#d2d2d2;font-size:18px;line-height:1.7;">
              Se detectó que un cliente <strong style="color:#ffffff;">rechazó contenido 2 veces consecutivas</strong>.
            </p>

            <p style="margin:0 0 24px 0;color:#bcbcbc;font-size:16px;line-height:1.7;">
              Esta notificación fue generada automáticamente por el sistema para que el equipo pueda revisar el contenido y tomar acción lo antes posible.
            </p>

            ${organizacion}

            <!-- Tarea -->
            <div style="margin:0 0 28px 0;padding:24px;background:#111111;border:2px dashed #7ed957;border-radius:18px;text-align:center;">
              <div style="font-size:13px;color:#9f9f9f;letter-spacing:0.4px;text-transform:uppercase;margin-bottom:8px;">
                Tarea afectada
              </div>
              <div style="font-size:28px;line-height:1.4;color:#ffffff;font-weight:700;">
                ${params.tareaTitulo}
              </div>
            </div>

            <!-- Recomendación -->
            <div style="margin:0 0 26px 0;padding:20px;background:#1d1d1f;border:1px solid #2f2f33;border-radius:14px;">
              <p style="margin:0;color:#d0d0d0;font-size:16px;line-height:1.7;">
                Te recomendamos revisar el entregable y los comentarios del cliente para corregirlo cuanto antes y evitar más rechazos.
              </p>
            </div>

            <!-- Warning -->
            <div style="margin-top:8px;background:#4e4722;border-left:6px solid #f4c542;padding:18px 20px;border-radius:12px;">
              <p style="margin:0;color:#f0d27a;font-size:15px;line-height:1.7;">
                <strong>Atención:</strong> esta es una alerta automática generada por <strong>Sandía Shake</strong>. 
                No respondas directamente a este correo.
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="text-align:center;padding:22px 12px 4px 12px;color:#9e9e9e;font-size:13px;line-height:1.8;">
            <strong style="color:#d5d5d5;">Sandía Shake</strong> · Plataforma de gestión de contenidos<br/>
            Correo automático del sistema. Por favor no respondas este mensaje.
          </div>
        </div>
      </div>
    </body>
  </html>
  `;
}