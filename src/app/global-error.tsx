"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("[app:global-error]", {
    message: error.message,
    digest: error.digest,
    stack: error.stack,
  });

  return (
    <html lang="en">
      <body className="bg-background text-foreground">
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "2rem" }}>
          <div style={{ maxWidth: "42rem", textAlign: "center" }}>
            <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "1rem" }}>
              The app hit a runtime error.
            </h1>
            <p style={{ color: "var(--muted-foreground)", marginBottom: "1.5rem" }}>
              We logged the failure so it can be traced. Try again after checking runtime configuration and database access.
            </p>
            <button
              onClick={reset}
              style={{
                borderRadius: "999px",
                padding: "0.75rem 1.25rem",
                border: "1px solid currentColor",
                background: "transparent",
                cursor: "pointer",
              }}
              type="button"
            >
              Reload app
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
