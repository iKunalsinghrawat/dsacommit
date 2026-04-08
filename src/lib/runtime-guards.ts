export function getRuntimeErrorDetails(error: unknown) {
  return {
    code:
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code)
        : "",
    message: error instanceof Error ? error.message : String(error ?? ""),
  };
}

export function isMissingDatabaseConfigurationError(error: unknown) {
  const { message } = getRuntimeErrorDetails(error);
  return /DATABASE_URL is not configured/i.test(message);
}

export function isMissingAuthConfigurationError(error: unknown) {
  const { message } = getRuntimeErrorDetails(error);
  return /AUTH_SECRET|NEXTAUTH_SECRET|Authentication secret is not configured/i.test(message);
}

export function isPrismaCompatibilityError(error: unknown) {
  const { code, message } = getRuntimeErrorDetails(error);

  return (
    code === "P2021" ||
    code === "P2022" ||
    /RoadmapItem|ChangeRequest|isArchived|archivedAt|ProblemTestCase|CodeDraft|CodeSubmission|codeExecutionEnabled|starterCode|starterLanguage|accessGrants|passwordResetRequired|sessionVersion|deletedAt|lastActiveAt|ConnectionRequest|ConversationParticipant|Conversation|DirectMessage|GroupJoinRequest|GroupMember|Notification|UserBlock|UserConnection/i.test(
      message,
    )
  );
}

export function isRecoverableRuntimeError(error: unknown) {
  return (
    isMissingDatabaseConfigurationError(error) ||
    isMissingAuthConfigurationError(error) ||
    isPrismaCompatibilityError(error)
  );
}

export function logServerError(scope: string, error: unknown, context?: Record<string, unknown>) {
  const { code, message } = getRuntimeErrorDetails(error);

  console.error(`[runtime:${scope}] ${message}`, {
    code: code || undefined,
    context,
    stack: error instanceof Error ? error.stack : undefined,
  });
}
