export function getMFACodeEmailHTML(code: string, userName: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Código de Verificación - SandíaShake</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="background-color: #2b2b30; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="color: #6cbe45; margin: 0; font-size: 28px;">🍉 SandíaShake</h1>
    </div>

    <!-- Body -->
    <div style="background-color: white; padding: 40px 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h2 style="color: #2b2b30; margin-top: 0;">Hola ${userName},</h2>

      <p style="color: #666; font-size: 16px; line-height: 1.6;">
        Alguien intentó iniciar sesión en tu cuenta. Para continuar, ingresa el siguiente código de verificación:
      </p>

      <!-- Code Box -->
      <div style="background-color: #f8f8f8; border: 2px dashed #6cbe45; border-radius: 8px; padding: 30px; text-align: center; margin: 30px 0;">
        <div style="font-size: 42px; font-weight: bold; letter-spacing: 8px; color: #2b2b30; font-family: 'Courier New', monospace;">
          ${code}
        </div>
      </div>

      <p style="color: #666; font-size: 14px; line-height: 1.6;">
        Este código expira en <strong>10 minutos</strong>.
      </p>

      <p style="color: #666; font-size: 14px; line-height: 1.6;">
        Si no intentaste iniciar sesión, ignora este correo o contacta a soporte si tienes dudas sobre la seguridad de tu cuenta.
      </p>

      <!-- Warning Box -->
      <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-top: 30px; border-radius: 4px;">
        <p style="margin: 0; color: #856404; font-size: 13px;">
          <strong>⚠️ Seguridad:</strong> Nunca compartas este código con nadie. SandíaShake nunca te pedirá este código por teléfono o mensaje.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
      <p style="margin: 5px 0;">SandíaShake - Sistema de Gestión</p>
      <p style="margin: 5px 0;">Este es un correo automático, por favor no respondas.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function getMFACodeEmailText(code: string, userName: string) {
  return `
Hola ${userName},

Alguien intentó iniciar sesión en tu cuenta de SandíaShake.

Tu código de verificación es: ${code}

Este código expira en 10 minutos.

Si no intentaste iniciar sesión, ignora este correo o contacta a soporte.

IMPORTANTE: Nunca compartas este código con nadie.

---
SandíaShake - Sistema de Gestión
Este es un correo automático, por favor no respondas.
  `.trim();
}
