type FacturaEmailDetalle = {
  concepto: string;
  descripcion?: string | null;
  categoria: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
};

function moneyCRC(n: number) {
  return `₡ ${Number(n || 0).toLocaleString("es-CR")}`;
}

function escapeHtml(s: any) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function badgeColor(estado: string) {
  const e = String(estado || "").toUpperCase();
  if (e === "PAGADA") return { bg: "#E7F7EE", fg: "#0F7A3B", border: "#BEE9CE" };
  if (e === "PARCIAL") return { bg: "#E9F2FF", fg: "#1F5FBF", border: "#C9DEFF" };
  if (e === "VENCIDA") return { bg: "#FFE9EA", fg: "#B42318", border: "#FFC7CB" };
  return { bg: "#F2F4F7", fg: "#344054", border: "#D0D5DD" }; 
}

export function getFacturaEmailHTML(args: {
  titulo: string; 
  organizacionNombre: string;
  clienteNombre: string;
  clienteCorreo: string;
  periodo: string;
  idFactura: number;
  estadoFactura: string;
  fechaVencimiento?: string | null;
  total: number;
  saldo: number;
  detalles: FacturaEmailDetalle[];
}) {
  const org = escapeHtml(args.organizacionNombre);
  const cli = escapeHtml(args.clienteNombre);
  const cor = escapeHtml(args.clienteCorreo);
  const per = escapeHtml(args.periodo);
  const titulo = escapeHtml(args.titulo);
  const venc = args.fechaVencimiento ? escapeHtml(args.fechaVencimiento) : "—";

  const badge = badgeColor(args.estadoFactura);
  const estado = escapeHtml(args.estadoFactura);

  const rows = (args.detalles || [])
    .map((d) => {
      const concepto = escapeHtml(d.concepto);
      const categoria = escapeHtml(d.categoria);
      const desc = d.descripcion
        ? `<div style="margin-top:4px;color:#667085;font-size:12px;line-height:1.35;">${escapeHtml(
            d.descripcion
          )}</div>`
        : "";

      return `
        <tr>
          <td style="padding:12px;border-bottom:1px solid #EAECF0;">
            <div style="font-weight:600;color:#101828;font-size:13px;line-height:1.35;">${concepto}</div>
            ${desc}
            <div style="margin-top:6px;color:#475467;font-size:12px;">${categoria}</div>
          </td>
          <td style="padding:12px;border-bottom:1px solid #EAECF0;text-align:right;color:#101828;font-size:13px;">${Number(
            d.cantidad || 0
          )}</td>
          <td style="padding:12px;border-bottom:1px solid #EAECF0;text-align:right;color:#101828;font-size:13px;">${moneyCRC(
            d.precio_unitario
          )}</td>
          <td style="padding:12px;border-bottom:1px solid #EAECF0;text-align:right;color:#101828;font-size:13px;font-weight:700;">${moneyCRC(
            d.subtotal
          )}</td>
        </tr>
      `;
    })
    .join("");

  const emptyRow = `
    <tr>
      <td colspan="4" style="padding:12px;color:#475467;font-size:13px;">
        No hay detalles registrados todavía.
      </td>
    </tr>
  `;

  return `
  <div style="margin:0;padding:0;background:#F2F4F7;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#F2F4F7;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="680" cellspacing="0" cellpadding="0" style="width:680px;max-width:680px;border-collapse:collapse;background:#ffffff;border:1px solid #EAECF0;border-radius:14px;overflow:hidden;">
            
            <!-- Header -->
            <tr>
              <td style="padding:18px 20px;background:#101828;">
                <div style="font-family:Arial,Helvetica,sans-serif;color:#D0D5DD;font-size:12px;letter-spacing:.3px;">
                  SandíaShake · Facturación
                </div>
                <div style="font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;font-size:20px;font-weight:800;margin-top:6px;line-height:1.25;">
                  ${titulo}
                </div>
                <div style="font-family:Arial,Helvetica,sans-serif;color:#EAECF0;font-size:12px;margin-top:8px;line-height:1.4;">
                  Factura <b>#${args.idFactura}</b> · Periodo <b>${per}</b>
                  &nbsp;·&nbsp;
                  <span style="display:inline-block;padding:3px 10px;border-radius:999px;background:${badge.bg};color:${badge.fg};border:1px solid ${badge.border};font-weight:700;">
                    ${estado}
                  </span>
                </div>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:18px 20px;font-family:Arial,Helvetica,sans-serif;">
                
                <!-- Info cards -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="padding:0 6px 12px 0;" valign="top">
                      <div style="border:1px solid #EAECF0;border-radius:12px;padding:12px;background:#FFFFFF;">
                        <div style="color:#667085;font-size:12px;margin-bottom:6px;">Organización</div>
                        <div style="color:#101828;font-weight:800;font-size:14px;line-height:1.3;">${org}</div>
                      </div>
                    </td>
                    <td style="padding:0 0 12px 6px;" valign="top">
                      <div style="border:1px solid #EAECF0;border-radius:12px;padding:12px;background:#FFFFFF;">
                        <div style="color:#667085;font-size:12px;margin-bottom:6px;">Cliente</div>
                        <div style="color:#101828;font-weight:800;font-size:14px;line-height:1.3;">${cli}</div>
                        <div style="color:#475467;font-size:12px;margin-top:4px;">${cor}</div>
                      </div>
                    </td>
                  </tr>
                </table>

                <!-- Summary -->
                <div style="border:1px solid #EAECF0;border-radius:12px;padding:12px;background:#F9FAFB;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                    <tr>
                      <td style="color:#475467;font-size:12px;">Vencimiento: <b style="color:#101828;">${venc}</b></td>
                      <td style="color:#475467;font-size:12px;text-align:right;">Monto pendiente: <b style="color:#101828;">${moneyCRC(
                        args.saldo
                      )}</b></td>
                    </tr>
                  </table>
                </div>

                <!-- Table -->
                <div style="margin-top:14px;color:#101828;font-weight:800;font-size:14px;">Desglose</div>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:10px;border-collapse:collapse;border:1px solid #EAECF0;border-radius:12px;overflow:hidden;">
                  <thead>
                    <tr style="background:#F9FAFB;">
                      <th style="text-align:left;padding:12px;color:#475467;font-size:12px;border-bottom:1px solid #EAECF0;">Concepto</th>
                      <th style="text-align:right;padding:12px;color:#475467;font-size:12px;border-bottom:1px solid #EAECF0;">Cant</th>
                      <th style="text-align:right;padding:12px;color:#475467;font-size:12px;border-bottom:1px solid #EAECF0;">Unit</th>
                      <th style="text-align:right;padding:12px;color:#475467;font-size:12px;border-bottom:1px solid #EAECF0;">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rows || emptyRow}
                  </tbody>
                </table>

                <!-- Total -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-top:12px;">
                  <tr>
                    <td></td>
                    <td style="width:260px;">
                      <div style="border:1px solid #EAECF0;border-radius:12px;padding:12px;background:#FFFFFF;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                          <tr>
                            <td style="color:#475467;font-size:12px;">Total</td>
                            <td style="color:#101828;font-size:14px;font-weight:900;text-align:right;">${moneyCRC(
                              args.total
                            )}</td>
                          </tr>
                        </table>
                      </div>
                    </td>
                  </tr>
                </table>

                <!-- Footer note -->
                <div style="margin-top:14px;color:#667085;font-size:12px;line-height:1.5;">
                  Este correo es una notificación informativa de tu estado de facturación.
                  Si ya realizaste el pago, puedes ignorar este mensaje.
                </div>

              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:14px 20px;background:#F9FAFB;border-top:1px solid #EAECF0;font-family:Arial,Helvetica,sans-serif;">
                <div style="color:#667085;font-size:12px;line-height:1.4;">
                  SandíaShake · Sistema de gestión
                </div>
                <div style="color:#98A2B3;font-size:11px;margin-top:4px;line-height:1.4;">
                  Este es un correo automático, por favor no respondas.
                </div>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </div>
  `;
}

export function getFacturaEmailText(args: {
  titulo: string;
  organizacionNombre: string;
  clienteNombre: string;
  clienteCorreo: string;
  periodo: string;
  idFactura: number;
  estadoFactura: string;
  fechaVencimiento?: string | null;
  total: number;
  saldo: number;
  detalles: { concepto: string; cantidad: number; precio_unitario: number; subtotal: number }[];
}) {
  const lines = (args.detalles || [])
    .map(
      (d) =>
        `- ${d.concepto} | cant: ${d.cantidad} | unit: ${moneyCRC(
          d.precio_unitario
        )} | sub: ${moneyCRC(d.subtotal)}`
    )
    .join("\n");

  return [
    `SandíaShake - ${args.titulo}`,
    `Factura #${args.idFactura} | Periodo: ${args.periodo} | Estado: ${args.estadoFactura}`,
    `Organización: ${args.organizacionNombre}`,
    `Cliente: ${args.clienteNombre} (${args.clienteCorreo})`,
    `Vence: ${args.fechaVencimiento ?? "—"}`,
    "",
    "Desglose:",
    lines || "(sin detalles)",
    "",
    `TOTAL: ${moneyCRC(args.total)}`,
    `SALDO: ${moneyCRC(args.saldo)}`,
  ].join("\n");
}
