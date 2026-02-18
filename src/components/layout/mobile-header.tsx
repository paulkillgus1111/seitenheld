"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";

export function MobileHeader() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-white/95 backdrop-blur-sm px-4 md:hidden">
        <Link href="/dashboard" className="flex items-center">
          <span className="text-sm font-semibold tracking-tight">
            Seitenheld
          </span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(true)}
          aria-label="Menü öffnen"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </header>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="left" className="w-[280px] p-0">
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle>Seitenheld</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto">
            <Sidebar onLinkClick={() => setIsOpen(false)} hideHeader={true} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
