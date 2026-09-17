import type { Metadata } from "next";
import { RouteShell } from "@/components/layout/route-shell";

export const metadata: Metadata = { title: "Jobs" };
export default function Page() {
  return (
    <RouteShell
      title="Jobs"
      description="Review opportunities that match your preferences."
    />
  );
}
