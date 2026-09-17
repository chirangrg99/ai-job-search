import type { Metadata } from "next";
import { RouteShell } from "@/components/layout/route-shell";

export const metadata: Metadata = { title: "Applications" };
export default function Page() {
  return (
    <RouteShell
      title="Applications"
      description="Track your manual applications and next steps."
    />
  );
}
