"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  CalendarDays,
  ListChecks,
  Mail,
  Workflow,
  Download,
  User,
  Settings,
  LogOut,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Events", href: "/dashboard/events", icon: CalendarDays },
  { label: "Leads verwalten", href: "/dashboard/leads", icon: ListChecks },
  { label: "Follow-up Mails", href: "/dashboard/mails", icon: Mail },
  { label: "CRM Integration", href: "/dashboard/crm", icon: Workflow },
  { label: "Downloads", href: "/dashboard/downloads", icon: Download },
  { label: "Seats", href: "/dashboard/seats", icon: Phone },
  { label: "Pricing", href: "/dashboard/pricing", icon: Settings },
  { label: "Profil", href: "/dashboard/profile", icon: User },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

type SidebarProps = {
  onLinkClick?: () => void;
  hideHeader?: boolean;
};

export function Sidebar({ onLinkClick, hideHeader = false }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <aside className="flex h-full flex-col">
      {!hideHeader && (
        <div className="flex h-16 items-center border-b px-4">
          <span className="text-sm font-semibold tracking-tight">
            Seitenheld
          </span>
        </div>
      )}
      <nav className="flex flex-1 flex-col gap-1 p-3 text-sm">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onLinkClick}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                "text-muted-foreground hover:bg-neutral-100 hover:text-foreground",
                isActive && "font-medium"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full justify-start text-muted-foreground hover:bg-neutral-100 hover:text-foreground"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Abmelden
        </Button>
        <div className="mt-3 flex flex-col gap-1 text-xs text-muted-foreground">
          <Link
            href="/dashboard/impressum"
            onClick={onLinkClick}
            className="hover:text-foreground"
          >
            Impressum
          </Link>
          <Link
            href="/dashboard/agb"
            onClick={onLinkClick}
            className="hover:text-foreground"
          >
            AGB
          </Link>
          <Link
            href="/dashboard/datenschutz"
            onClick={onLinkClick}
            className="hover:text-foreground"
          >
            Datenschutz
          </Link>
        </div>
      </div>
    </aside>
  );
}

