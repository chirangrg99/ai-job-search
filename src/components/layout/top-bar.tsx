"use client";

import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { usePathname } from "next/navigation";
import { ChevronRight, UserRound } from "lucide-react";
import { getCurrentNavigation } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { MobileNavigation } from "./mobile-navigation";

export function TopBar() {
  const pathname = usePathname();
  const current = getCurrentNavigation(pathname);
  const isJobDetail = pathname.startsWith("/jobs/");
  return (
    <header className="sticky top-0 z-10 flex min-h-topbar-mobile items-center gap-3 border-b bg-surface px-4 sm:px-6 lg:min-h-topbar xl:px-8">
      <MobileNavigation />
      <nav
        aria-label="Breadcrumb"
        className="min-w-0 flex-1 text-sm text-text-secondary"
      >
        <ol className="flex flex-wrap items-center gap-2">
          <li className="hidden sm:block">Workspace</li>
          <li className="hidden sm:block">
            <ChevronRight className="size-4" aria-hidden="true" />
          </li>
          <li>
            {isJobDetail ? (
              <Link href="/jobs" className="hover:text-primary-hover">
                Jobs
              </Link>
            ) : (
              <span aria-current="page">{current?.label ?? "Page"}</span>
            )}
          </li>
          {isJobDetail && (
            <>
              <li>
                <ChevronRight className="size-4" aria-hidden="true" />
              </li>
              <li aria-current="page">Job Detail</li>
            </>
          )}
        </ol>
      </nav>
      <form action={signOut}>
        <Button type="submit" variant="ghost">
          Sign out
        </Button>
      </form>
      <Button asChild variant="ghost" size="icon">
        <Link href="/profile" aria-label="Open profile">
          <UserRound className="size-5" aria-hidden="true" />
        </Link>
      </Button>
    </header>
  );
}
