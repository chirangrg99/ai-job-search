import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <main className="mx-auto max-w-content p-8">
      <h1 className="text-page font-semibold">Page not found</h1>
      <p className="my-4 text-text-secondary">
        This page does not exist in your workspace.
      </p>
      <Button asChild>
        <Link href="/">Return to Overview</Link>
      </Button>
    </main>
  );
}
