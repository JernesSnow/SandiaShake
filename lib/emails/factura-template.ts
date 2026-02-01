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

function escapeHtml(s: string) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
  const rows = (args.detalles || [])
    .map((d) => {
      const desc = d.descripcion
        ? `<div style="color:#bdbdbd;font-size:12px;margin-top:2px">${escapeHtml(
            d.descripcion
          )}</div>`
        : "";
      return `
        <tr>
          <td style="padding:10px;border-bottom:1px solid #2c2c2c;">
            <div style="font-weight:600;color:#ffffff;">${escapeHtml(d.concepto)}</div>
            ${desc}
            <div style="color:#9a9a9a;font-size:12px;margin-top:3px;">${escapeHtml(d.categoria)}</div>
          </td>
          <td style="padding:10px;border-bottom:1px solid #2c2c2c;text-align:right;color:#ffffff;">${Number(
            d.cantidad || 0
          )}</td>
          <td style="padding:10px;border-bottom:1px solid #2c2c2c;text-align:right;color:#ffffff;">${moneyCRC(
            d.precio_unitario
          )}</td>
          <td style="padding:10px;border-bottom:1px solid #2c2c2c;text-align:right;color:#ffffff;font-weight:600;">${moneyCRC(
            d.subtotal
          )}</td>
        </tr>
      `;
    })
    .join("");

  const venc = args.fechaVencimiento ? escapeHtml(args.fechaVencimiento) : "—";

  return `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial; background:#0b0b0c; padding:24px;">
    <div style="max-width:680px;margin:0 auto;background:#1a1a1d;border:1px solid #2c2c2c;border-radius:14px;overflow:hidden;">
      <div style="padding:18px 20px;background:#111113;border-bottom:1px solid #2c2c2c;">
        <div style="font-size:14px;color:#cfcfcf;">SandíaShake · Facturación</div>
        <div style="font-size:18px;color:#ffffff;font-weight:700;margin-top:4px;">${escapeHtml(args.titulo)}</div>
        <div style="font-size:12px;color:#bdbdbd;margin-top:6px;">
          Factura <b>#${args.idFactura}</b> · Periodo <b>${escapeHtml(args.periodo)}</b> · Estado <b>${escapeHtml(
            args.estadoFactura
          )}</b>
        </div>
      </div>

      <div style="padding:18px 20px;">
        <div style="display:flex; gap:12px; flex-wrap:wrap;">
          <div style="flex:1; min-width:240px; background:#111113;border:1px solid #2c2c2c;border-radius:12px;padding:12px;">
            <div style="font-size:12px;color:#9a9a9a;margin-bottom:6px;">Organización</div>
            <div style="color:#ffffff;font-weight:700;">${escapeHtml(args.organizacionNombre)}</div>
          </div>
          <div style="flex:1; min-width:240px; background:#111113;border:1px solid #2c2c2c;border-radius:12px;padding:12px;">
            <div style="font-size:12px;color:#9a9a9a;margin-bottom:6px;">Cliente</div>
            <div style="color:#ffffff;font-weight:700;">${escapeHtml(args.clienteNombre)}</div>
            <div style="color:#bdbdbd;font-size:12px;margin-top:3px;">${escapeHtml(args.clienteCorreo)}</div>
          </div>
        </div>

        <div style="margin-top:14px;background:#111113;border:1px solid #2c2c2c;border-radius:12px;padding:12px;">
          <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;">
            <div style="color:#bdbdbd;font-size:12px;">Vencimiento: <b style="color:#ffffff;">${venc}</b></div>
            <div style="color:#bdbdbd;font-size:12px;">Saldo actual: <b style="color:#ffffff;">${moneyCRC(
              args.saldo
            )}</b></div>
          </div>
        </div>

        <div style="margin-top:14px;">
          <div style="color:#ffffff;font-weight:700;margin-bottom:8px;">Desglose</div>
          <table style="width:100%;border-collapse:collapse;background:#0f0f11;border:1px solid #2c2c2c;border-radius:12px;overflow:hidden;">
            <thead>
              <tr>
                <th style="text-align:left;padding:10px;color:#bdbdbd;font-size:12px;border-bottom:1px solid #2c2c2c;">Concepto</th>
                <th style="text-align:right;padding:10px;color:#bdbdbd;font-size:12px;border-bottom:1px solid #2c2c2c;">Cant</th>
                <th style="text-align:right;padding:10px;color:#bdbdbd;font-size:12px;border-bottom:1px solid #2c2c2c;">Unit</th>
                <th style="text-align:right;padding:10px;color:#bdbdbd;font-size:12px;border-bottom:1px solid #2c2c2c;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${
                rows ||
                `
                <tr>
                  <td colspan="4" style="padding:12px;color:#bdbdbd;font-size:12px;">
                    No hay detalles registrados todavía.
                  </td>
                </tr>
              `
              }
            </tbody>
          </table>
        </div>

        <div style="margin-top:14px;display:flex;justify-content:flex-end;">
          <div style="min-width:260px;background:#111113;border:1px solid #2c2c2c;border-radius:12px;padding:12px;">
            <div style="display:flex;justify-content:space-between;color:#bdbdbd;font-size:12px;">
              <span>Total</span>
              <span style="color:#ffffff;font-weight:800;">${moneyCRC(args.total)}</span>
            </div>
          </div>
        </div>

        <div style="margin-top:16px;color:#9a9a9a;font-size:12px;line-height:1.45;">
          Este correo es una notificación informativa de tu estado de facturación.
        </div>
      </div>
    </div>
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
        `- ${d.concepto} | cant: ${d.cantidad} | unit: ${moneyCRC(d.precio_unitario)} | sub: ${moneyCRC(d.subtotal)}`
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
