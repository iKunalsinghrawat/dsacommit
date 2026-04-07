"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app:error]", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <main className="page-shell flex min-h-[70vh] items-center py-16">
      <Card className="mx-auto max-w-2xl glass-panel-strong">
        <CardHeader>
          <CardTitle>This page is temporarily unavailable.</CardTitle>
          <CardDescription>
            We logged the runtime failure and kept the app responsive. Try reloading, or jump back to a safe page.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={reset} type="button">
            Reload page
          </Button>
          <Button asChild variant="secondary">
            <Link href="/">Go home</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
