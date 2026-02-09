type TempAccessEmailParams = {
  userName: string;
  tempPassword: string;
  loginUrl: string;
};

export function getTempAccessEmailHTML({
  userName,
  tempPassword,
  loginUrl,
}: TempAccessEmailParams) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Acceso temporal - SandíaShake</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background-color:#f5f5f5;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">

    <!-- Header -->
    <div style="background-color:#2b2b30;padding:30px;text-align:center;border-radius:8px 8px 0 0;">
      <h1 style="color:#6cbe45;margin:0;font-size:28px;">🍉 SandíaShake</h1>
    </div>

    <!-- Body -->
    <div style="background-color:#ffffff;padding:40px 30px;border-radius:0 0 8px 8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
      <h2 style="color:#2b2b30;margin-top:0;">Hola ${userName},</h2>

      <p style="color:#666;font-size:16px;line-height:1.6;">
        Hemos generado un <strong>acceso temporal</strong> para que puedas ingresar a tu cuenta de SandíaShake.
      </p>

      <!-- Password Box -->
      <div style="background-color:#f8f8f8;border:2px dashed #6cbe45;border-radius:8px;padding:30px;text-align:center;margin:30px 0;">
        <div style="font-size:20px;font-weight:bold;letter-spacing:2px;color:#2b2b30;font-family:'Courier New',monospace;">
          ${tempPassword}
        </div>
      </div>

      <p style="color:#666;font-size:14px;line-height:1.6;">
        Al iniciar sesión, el sistema te pedirá <strong>cambiar esta contraseña inmediatamente</strong> por razones de seguridad.
      </p>

      <!-- CTA -->
      <div style="text-align:center;margin:30px 0;">
        <a href="${loginUrl}"
           style="display:inline-block;background-color:#6cbe45;color:#1a1a1d;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600;">
          Iniciar sesión
        </a>
      </div>

      <!-- Warning -->
      <div style="background-color:#fff3cd;border-left:4px solid #ffc107;padding:15px;margin-top:30px;border-radius:4px;">
        <p style="margin:0;color:#856404;font-size:13px;">
          <strong>⚠️ Seguridad:</strong> Esta contraseña es personal y temporal. No la compartas con nadie.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:20px;color:#999;font-size:12px;">
      <p style="margin:5px 0;">SandíaShake - Sistema de Gestión</p>
      <p style="margin:5px 0;">Este es un correo automático, por favor no respondas.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function getTempAccessEmailText({
  userName,
  tempPassword,
  loginUrl,
}: TempAccessEmailParams) {
  return `
Hola ${userName},

Hemos generado un acceso temporal para tu cuenta de SandíaShake.

Contraseña temporal:
${tempPassword}

Al iniciar sesión, el sistema te pedirá cambiar esta contraseña inmediatamente.

Inicia sesión aquí:
${loginUrl}

⚠️ Seguridad: No compartas esta contraseña con nadie.

---
SandíaShake - Sistema de Gestión
Este es un correo automático, por favor no respondas.
  `.trim();
}
