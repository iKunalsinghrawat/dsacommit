import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { problemExecutionSchema } from "@/lib/validators/platform";
import { submitProblemCode } from "@/server/problem-execution-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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
        error: parsed.error.issues[0]?.message ?? "Invalid submit request.",
      },
      { status: 400 },
    );
  }

  const result = await submitProblemCode({
    userId: user.id,
    userRole: user.role,
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

  revalidatePath(`/problems/${id}`);
  revalidatePath("/problems");
  revalidatePath("/dashboard");

  return NextResponse.json({ ok: true, result });
}
