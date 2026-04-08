import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { logServerError } from "@/lib/runtime-guards";
import {
  deleteProblemDraftSchema,
  problemDraftSchema,
} from "@/lib/validators/platform";
import {
  deleteProblemDraft,
  saveProblemDraft,
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
    const parsed = problemDraftSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed.error.issues[0]?.message ?? "Invalid draft payload.",
        },
        { status: 400 },
      );
    }

    const draft = await saveProblemDraft({
      userId: user.id,
      problemId: id,
      language: parsed.data.language,
      code: parsed.data.code,
    });

    if (!draft) {
      return NextResponse.json(
        { ok: false, error: "Draft saving is not available for this problem." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      draft: {
        language: draft.language,
        sourceCode: draft.sourceCode,
        updatedAt: draft.updatedAt,
      },
    });
  } catch (error) {
    logServerError("api/problems/[id]/draft:POST", error);
    return NextResponse.json(
      { ok: false, error: "Draft saving is temporarily unavailable." },
      { status: 500 },
    );
  }
}

export async function DELETE(
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
    const parsed = deleteProblemDraftSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed.error.issues[0]?.message ?? "Invalid draft delete request.",
        },
        { status: 400 },
      );
    }

    const deleted = await deleteProblemDraft({
      userId: user.id,
      problemId: id,
      language: parsed.data.language,
    });

    if (!deleted) {
      return NextResponse.json(
        { ok: false, error: "Draft saving is not available for this problem." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logServerError("api/problems/[id]/draft:DELETE", error);
    return NextResponse.json(
      { ok: false, error: "Draft deletion is temporarily unavailable." },
      { status: 500 },
    );
  }
}
