"use client";

import { Search, Bell, Menu } from "lucide-react";

export function Topbar({
  title,
  onMenuClick,
}: {
  title: string;
  onMenuClick?: () => void;
}) {
  return (
    <header className="flex items-center justify-between gap-4 rounded-3xl bg-white px-5 py-4 shadow-sm shadow-steel-900/5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Abrir menú"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-steel-600 hover:bg-steel-50 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="font-display text-xl font-bold tracking-tight text-steel-950 sm:text-2xl">
          {title}
        </h1>
      </div>

      <div className="hidden flex-1 items-center gap-2 rounded-full bg-steel-50 px-4 py-2.5 md:flex md:max-w-xs">
        <Search className="h-4 w-4 shrink-0 text-steel-400" />
        <input
          type="text"
          placeholder="Buscar…"
          className="w-full bg-transparent text-sm text-steel-800 placeholder:text-steel-400 focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <button
          type="button"
          aria-label="Notificaciones"
          className="relative flex h-10 w-10 items-center justify-center rounded-full bg-steel-50 text-steel-600 transition-colors hover:bg-steel-100"
        >
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute top-2.5 right-2.5 h-1.5 w-1.5 rounded-full bg-steel-950" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-steel-950 text-sm font-semibold text-white">
            MR
          </div>
          <div className="hidden leading-tight sm:block">
            <p className="text-sm font-semibold text-steel-950">
              Distribuidora MR
            </p>
            <p className="text-xs text-steel-500">cliente@distribuidora.com</p>
          </div>
        </div>
      </div>
    </header>
  );
}
