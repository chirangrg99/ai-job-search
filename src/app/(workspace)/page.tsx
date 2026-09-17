import type { Metadata } from "next";
import { RouteShell } from "@/components/layout/route-shell";

export const metadata: Metadata = { title: "Overview" };
export default function Page() {
  return (
    <RouteShell
      title="Overview"
      description="Your opportunities, priorities and application progress."
    />
  );
}
