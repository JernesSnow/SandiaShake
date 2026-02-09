
export function getAccessProvisioningEmailHTML(params: {
  userName: string;
  tempPassword: string;
  loginUrl: string;
}) {
  const { userName, tempPassword, loginUrl } = params;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Acceso a SandíaShake</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">

    <!-- Header -->
    <div style="background:#2b2b30;padding:28px;text-align:center;border-radius:8px 8px 0 0;">
      <h1 style="margin:0;color:#6cbe45;font-size:28px;">🍉 SandíaShake</h1>
    </div>

    <!-- Body -->
    <div style="background:#ffffff;padding:36px 28px;border-radius:0 0 8px 8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
      <h2 style="margin-top:0;color:#2b2b30;">Hola ${userName},</h2>

      <p style="color:#555;font-size:15px;line-height:1.6;">
        Se ha habilitado acceso a tu cuenta en <strong>SandíaShake</strong>.
        Para ingresar, utiliza la siguiente contraseña temporal:
      </p>

      <!-- Password Box -->
      <div style="margin:28px 0;padding:26px;border:2px dashed #6cbe45;border-radius:8px;background:#f8f8f8;text-align:center;">
        <div style="font-family:'Courier New',monospace;font-size:22px;letter-spacing:3px;font-weight:bold;color:#2b2b30;">
          ${tempPassword}
        </div>
      </div>

      <p style="color:#555;font-size:14px;line-height:1.6;">
        Por seguridad, el sistema te pedirá <strong>cambiar esta contraseña inmediatamente</strong>
        después de iniciar sesión.
      </p>

      <!-- CTA -->
      <div style="text-align:center;margin:32px 0;">
        <a href="${loginUrl}"
           style="display:inline-block;background:#6cbe45;color:#1a1a1d;
                  padding:12px 22px;border-radius:6px;text-decoration:none;
                  font-weight:600;font-size:14px;">
          Iniciar sesión
        </a>
      </div>

      <!-- Security Notice -->
      <div style="margin-top:30px;background:#fff3cd;border-left:4px solid #ffc107;
                  padding:14px;border-radius:4px;">
        <p style="margin:0;color:#856404;font-size:13px;">
          <strong>⚠️ Seguridad:</strong> Esta contraseña es temporal y personal.
          No la compartas con nadie. SandíaShake nunca te pedirá esta contraseña por otros medios.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:18px;color:#999;font-size:12px;">
      <p style="margin:4px 0;">SandíaShake · Sistema de Gestión</p>
      <p style="margin:4px 0;">Este es un correo automático, por favor no respondas.</p>
    </div>

  </div>
</body>
</html>
  `.trim();
}

export function getAccessProvisioningEmailText(params: {
  userName: string;
  tempPassword: string;
  loginUrl: string;
}) {
  const { userName, tempPassword, loginUrl } = params;

  return `
Hola ${userName},

Se ha habilitado acceso a tu cuenta en SandíaShake.

Tu contraseña temporal es:
${tempPassword}

Al iniciar sesión, el sistema te pedirá cambiar esta contraseña inmediatamente.

Inicia sesión aquí:
${loginUrl}

⚠️ Seguridad:
Esta contraseña es temporal y personal. No la compartas con nadie.

---
SandíaShake · Sistema de Gestión
Este es un correo automático, por favor no respondas.
  `.trim();
}
