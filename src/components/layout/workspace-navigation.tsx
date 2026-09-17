"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavigationActive, navigationItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type WorkspaceNavigationProps = { onNavigate?: () => void };

export function WorkspaceNavigation({ onNavigate }: WorkspaceNavigationProps) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main navigation">
      <ul className="space-y-2">
        {navigationItems.map(({ href, label, icon: Icon }) => {
          const active = isNavigationActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-md px-3 py-3 text-sm font-medium transition-colors duration-(--motion-fast)",
                  active
                    ? "bg-primary-soft text-primary-hover"
                    : "text-text-secondary hover:bg-surface-subtle hover:text-text-primary",
                )}
              >
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
