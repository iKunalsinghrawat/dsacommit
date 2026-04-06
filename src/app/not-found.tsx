import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <main className="page-shell flex min-h-screen items-center justify-center py-16">
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>That page doesn&apos;t exist yet.</CardTitle>
          <CardDescription>
            The route may be wrong, the content may have been removed, or you might need to return to the main platform flow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/">Back to home</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
