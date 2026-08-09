"use client";

import { useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function DashboardShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-steel-100 p-3 sm:p-4 lg:p-6">
      <div className="mx-auto flex max-w-[1600px] gap-4 lg:gap-6">
        <Sidebar className="hidden lg:flex" />

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Cerrar menú"
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-steel-950/50 backdrop-blur-sm"
            />
            <div className="relative flex h-full w-72 flex-col gap-4 p-3">
              <div className="flex justify-end">
                <button
                  type="button"
                  aria-label="Cerrar menú"
                  onClick={() => setMobileOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-steel-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <Sidebar className="flex-1" />
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-4 lg:gap-6">
          <Topbar title={title} onMenuClick={() => setMobileOpen(true)} />
          <main className="flex flex-1 flex-col gap-4 lg:gap-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
