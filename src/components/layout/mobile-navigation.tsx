"use client";

import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { WorkspaceNavigation } from "./workspace-navigation";

export function MobileNavigation() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    // Matches the centralized lg breakpoint. Close the modal when desktop nav appears.
    const desktop = window.matchMedia("(min-width: 64rem)");
    const onChange = () => {
      if (desktop.matches) setOpen(false);
    };
    desktop.addEventListener("change", onChange);
    return () => desktop.removeEventListener("change", onChange);
  }, []);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="size-5" aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-sidebar overflow-y-auto p-4">
        <SheetHeader className="p-0 pr-8">
          <SheetTitle>Application assistant</SheetTitle>
          <SheetDescription>Navigate your career workspace.</SheetDescription>
        </SheetHeader>
        <WorkspaceNavigation onNavigate={() => setOpen(false)} />
        <p className="text-sm text-text-secondary">
          Verified facts.
          <br />
          Thoughtful applications.
        </p>
      </SheetContent>
    </Sheet>
  );
}
