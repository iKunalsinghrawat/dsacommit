import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "dsa-commit",
    timestamp: new Date().toISOString(),
  });
}
