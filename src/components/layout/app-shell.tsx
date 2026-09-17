import type { ReactNode } from "react";
import { AppSidebar } from "./app-sidebar";
import { TopBar } from "./top-bar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <a
        href="#main-content"
        className="fixed top-3 left-3 z-50 -translate-y-24 rounded-md bg-primary px-4 py-3 font-medium text-on-primary shadow-md focus:translate-y-0"
      >
        Skip to main content
      </a>
      <AppSidebar />
      <div className="min-w-0 lg:pl-sidebar">
        <TopBar />
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-content scroll-mt-20 p-4 focus:outline-none sm:p-6 xl:p-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
