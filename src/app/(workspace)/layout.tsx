import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/server/auth/guard";
export const dynamic = "force-dynamic";
export default async function WorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireUser();
  return <AppShell>{children}</AppShell>;
}
