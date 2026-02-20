export function getRejectionAlertEmailHTML(params: {
  colaboradorNombre?: string | null;
  tareaTitulo: string;
  organizacionNombre?: string | null;
}) {
  const nombre = params.colaboradorNombre?.trim() || "equipo";
  const organizacion = params.organizacionNombre?.trim()
    ? `<p style="margin:0 0 18px 0;color:#bdbdbd;font-size:16px;">Organización: <b style="color:#ffffff;">${params.organizacionNombre}</b></p>`
    : "";

  return `
  <div style="margin:0;padding:0;background-color:#111111;font-family:Arial,Helvetica,sans-serif;color:#ffffff;">
    <div style="max-width:700px;margin:0 auto;padding:30px 20px;">
      
      <div style="background:#4a4a4f;padding:24px 30px;border-radius:16px 16px 0 0;text-align:center;">
        <div style="font-size:42px;font-weight:700;color:#7ed957;line-height:1.2;">
          🍉 SandíaShake
        </div>
      </div>

      <div style="background:#151515;padding:40px 34px;border-radius:0 0 16px 16px;box-shadow:0 8px 30px rgba(0,0,0,0.35);">
        <h1 style="margin:0 0 24px 0;font-size:42px;line-height:1.15;color:#ffffff;">
          Hola ${nombre},
        </h1>

        <p style="margin:0 0 16px 0;color:#cfcfcf;font-size:22px;line-height:1.7;">
          Se detectó que un cliente <b style="color:#ffffff;">rechazó contenido 2 veces consecutivas</b>.
        </p>

        ${organizacion}

        <p style="margin:0 0 24px 0;color:#cfcfcf;font-size:22px;line-height:1.7;">
          La tarea afectada es:
        </p>

        <div style="margin:0 0 28px 0;padding:28px;border:3px dashed #7ed957;border-radius:20px;background:#111111;text-align:center;">
          <div style="font-size:18px;color:#9f9f9f;margin-bottom:10px;">Tarea</div>
          <div style="font-size:34px;line-height:1.4;color:#ffffff;font-weight:700;">
            ${params.tareaTitulo}
          </div>
        </div>

        <p style="margin:0 0 16px 0;color:#cfcfcf;font-size:21px;line-height:1.7;">
          Te recomendamos revisar el entregable y los comentarios del cliente lo antes posible para evitar más rechazos.
        </p>

        <div style="margin-top:30px;background:#4e4722;border-left:6px solid #f4c542;padding:18px 20px;border-radius:10px;">
          <p style="margin:0;color:#f0d27a;font-size:18px;line-height:1.6;">
            <b>Atención:</b> esta es una alerta automática del sistema. No respondas este correo.
          </p>
        </div>
      </div>

      <div style="text-align:center;padding:26px 10px 10px 10px;color:#a1a1a1;font-size:15px;line-height:1.8;">
        SandíaShake - Sistema de Gestión<br/>
        Este es un correo automático, por favor no respondas.
      </div>
    </div>
  </div>
  `;
}