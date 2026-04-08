import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { logServerError } from "@/lib/runtime-guards";
import { problemExecutionSchema } from "@/lib/validators/platform";
import {
  canExecuteLanguage,
  getUnsupportedExecutionMessage,
  runProblemCode,
} from "@/server/problem-execution-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Authentication required." },
        { status: 401 },
      );
    }

    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = problemExecutionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed.error.issues[0]?.message ?? "Invalid run request.",
        },
        { status: 400 },
      );
    }

    if (!canExecuteLanguage(parsed.data.language)) {
      return NextResponse.json(
        {
          ok: false,
          error: getUnsupportedExecutionMessage(parsed.data.language),
        },
        { status: 422 },
      );
    }

    const result = await runProblemCode({
      problemId: id,
      code: parsed.data.code,
      language: parsed.data.language,
    });

    if (!result) {
      return NextResponse.json(
        { ok: false, error: "Code execution is not available for this problem." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    logServerError("api/problems/[id]/run", error);
    return NextResponse.json(
      { ok: false, error: "Run Code is temporarily unavailable." },
      { status: 500 },
    );
  }
}
