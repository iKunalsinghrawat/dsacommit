import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { logServerError } from "@/lib/runtime-guards";
import { callSignalSchema } from "@/lib/validators/communication";
import {
  createCallSignal,
  getCallSignals,
} from "@/server/communication-service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ callSessionId: string }> },
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Authentication required." },
        { status: 401 },
      );
    }

    const { callSessionId } = await params;
    const { searchParams } = new URL(request.url);
    const since = searchParams.get("since") ?? undefined;

    const signals = await getCallSignals({
      currentUserId: user.id,
      callSessionId,
      since,
    });

    return NextResponse.json({ ok: true, signals });
  } catch (error) {
    logServerError("api/calls/[callSessionId]/signals:GET", error);
    return NextResponse.json(
      { ok: false, error: "Call signaling is temporarily unavailable." },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ callSessionId: string }> },
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Authentication required." },
        { status: 401 },
      );
    }

    const { callSessionId } = await params;
    const body = await request.json().catch(() => null);
    const parsed = callSignalSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed.error.issues[0]?.message ?? "Invalid call signal.",
        },
        { status: 400 },
      );
    }

    const signal = await createCallSignal({
      currentUserId: user.id,
      callSessionId,
      type: parsed.data.type,
      payload: parsed.data.payload,
    });

    return NextResponse.json({ ok: true, signal });
  } catch (error) {
    logServerError("api/calls/[callSessionId]/signals:POST", error);
    return NextResponse.json(
      { ok: false, error: "Unable to send the call signal right now." },
      { status: 500 },
    );
  }
}
