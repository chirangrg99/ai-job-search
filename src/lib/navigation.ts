import {
  BadgeCheck,
  BriefcaseBusiness,
  Files,
  LayoutDashboard,
  Settings,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";

export const navigationItems = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Jobs", href: "/jobs", icon: BriefcaseBusiness },
  { label: "Applications", href: "/applications", icon: Files },
  { label: "Profile", href: "/profile", icon: UserRound },
  { label: "Verified Answers", href: "/answers", icon: BadgeCheck },
  { label: "Job Preferences", href: "/preferences", icon: SlidersHorizontal },
  { label: "Settings", href: "/settings", icon: Settings },
] as const;

export function isNavigationActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}

export function getCurrentNavigation(pathname: string) {
  return navigationItems.find((item) =>
    isNavigationActive(pathname, item.href),
  );
}
