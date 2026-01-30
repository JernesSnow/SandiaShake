import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function proxy(_req: NextRequest) {
  return NextResponse.next();
}
