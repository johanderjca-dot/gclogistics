"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const NAV_LINKS = [
  { label: "Inicio", href: "#inicio" },
  { label: "Nosotros", href: "#nosotros" },
  { label: "Servicios", href: "#servicios" },
  { label: "Cómo Funciona", href: "#como-funciona" },
  { label: "Contacto", href: "#contacto" },
];

function Mark() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-6 w-6 shrink-0"
      aria-hidden="true"
    >
      <path
        d="M2 4 L10 12 L2 20"
        stroke="var(--color-steel-300)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13 4 L21 12 L13 20"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled
          ? "bg-steel-950/95 shadow-lg shadow-steel-950/20 backdrop-blur"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
        <Link
          href="#inicio"
          className="flex items-center gap-2 text-steel-50"
        >
          <Mark />
          <span className="font-display text-2xl font-bold uppercase tracking-tight">
            GC <span className="text-steel-300">Logistic</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-9 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-steel-100/80 transition-colors hover:text-steel-50"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-6 lg:flex">
          <Link
            href="/login"
            className="text-sm font-medium text-steel-100/80 transition-colors hover:text-steel-50"
          >
            Iniciar Sesión
          </Link>
          <a
            href="#contacto"
            className="rounded-full bg-steel-100 px-6 py-2.5 text-sm font-semibold text-steel-950 transition-colors hover:bg-white"
          >
            Solicitar Cotización
          </a>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Abrir menú"
          aria-expanded={menuOpen}
          className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 lg:hidden"
        >
          <span
            className={`h-0.5 w-6 bg-steel-50 transition-transform ${
              menuOpen ? "translate-y-2 rotate-45" : ""
            }`}
          />
          <span
            className={`h-0.5 w-6 bg-steel-50 transition-opacity ${
              menuOpen ? "opacity-0" : ""
            }`}
          />
          <span
            className={`h-0.5 w-6 bg-steel-50 transition-transform ${
              menuOpen ? "-translate-y-2 -rotate-45" : ""
            }`}
          />
        </button>
      </div>

      <div
        className={`overflow-hidden bg-steel-950/98 backdrop-blur transition-[max-height] duration-300 lg:hidden ${
          menuOpen ? "max-h-96" : "max-h-0"
        }`}
      >
        <nav className="flex flex-col gap-1 px-6 pb-6">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-3 text-base font-medium text-steel-100/85 transition-colors hover:bg-steel-900 hover:text-steel-50"
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/login"
            onClick={() => setMenuOpen(false)}
            className="rounded-lg px-3 py-3 text-base font-medium text-steel-100/85 transition-colors hover:bg-steel-900 hover:text-steel-50"
          >
            Iniciar Sesión
          </Link>
          <a
            href="#contacto"
            onClick={() => setMenuOpen(false)}
            className="mt-2 rounded-full bg-steel-100 px-6 py-3 text-center text-sm font-semibold text-steel-950"
          >
            Solicitar Cotización
          </a>
        </nav>
      </div>
    </header>
  );
}
