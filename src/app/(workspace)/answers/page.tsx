import type { Metadata } from "next";
import { RouteShell } from "@/components/layout/route-shell";

export const metadata: Metadata = { title: "Verified Answers" };
export default function Page() {
  return (
    <RouteShell
      title="Verified Answers"
      description="Keep reusable candidate answers accurate and traceable."
    />
  );
}
