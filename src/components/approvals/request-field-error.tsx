export function RequestFieldError({
  fieldErrors,
  name,
}: {
  fieldErrors: Record<string, string[] | undefined>;
  name: string;
}) {
  const message = fieldErrors[name]?.[0];

  if (!message) {
    return null;
  }

  return <p className="text-sm text-danger">{message}</p>;
}
