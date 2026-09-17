import type { Metadata } from "next";
import { RouteShell } from "@/components/layout/route-shell";

export const metadata: Metadata = { title: "Settings" };
export default function Page() {
  return (
    <RouteShell
      title="Settings"
      description="Manage your workspace, accessibility and data."
    />
  );
}
