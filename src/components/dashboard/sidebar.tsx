"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { NAV_GROUPS } from "@/lib/dashboard-nav";

function Mark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 shrink-0">
      <path
        d="M2 4 L10 12 L2 20"
        stroke="var(--color-steel-400)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13 4 L21 12 L13 20"
        stroke="var(--color-steel-900)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Sidebar({ className = "" }: { className?: string }) {
  const pathname = usePathname();

  return (
    <aside
      className={`flex w-64 shrink-0 flex-col rounded-3xl bg-white p-5 shadow-sm shadow-steel-900/5 ${className}`}
    >
      <Link href="/" className="flex items-center gap-2 px-2 py-1">
        <Mark />
        <span className="font-display text-xl font-bold tracking-tight text-steel-950 uppercase">
          GC <span className="text-steel-500">Logistic</span>
        </span>
      </Link>

      <nav className="mt-8 flex flex-1 flex-col gap-6">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-2 text-[11px] font-semibold tracking-[0.15em] text-steel-500 uppercase">
              {group.label}
            </p>
            <div className="flex flex-col gap-1">
              {group.items.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-steel-950 text-white"
                        : "text-steel-700 hover:bg-steel-50 hover:text-steel-950"
                    }`}
                  >
                    <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <Link
        href="/"
        className="mt-4 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-steel-500 transition-colors hover:bg-steel-50 hover:text-steel-950"
      >
        <LogOut className="h-[18px] w-[18px]" strokeWidth={2} />
        Cerrar Sesión
      </Link>
    </aside>
  );
}
