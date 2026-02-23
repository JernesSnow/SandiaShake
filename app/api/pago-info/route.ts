import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    sinpe: process.env.PAGO_SINPE ?? null,
    cuenta: process.env.PAGO_CUENTA ?? null,
    titular: process.env.PAGO_TITULAR ?? null,
    emailComprobante: process.env.PAGO_EMAIL_COMPROBANTE ?? null,
  });
}
