import type { Metadata } from "next";
import { RouteShell } from "@/components/layout/route-shell";

export const metadata: Metadata = { title: "Job Detail" };
export default function Page() {
  return (
    <RouteShell
      title="Job Detail"
      description="Understand an opportunity and the evidence behind your fit."
    />
  );
}
