import Link from "next/link";

const FOOTER_LINKS = [
  { label: "Inicio", href: "#inicio" },
  { label: "Nosotros", href: "#nosotros" },
  { label: "Servicios", href: "#servicios" },
  { label: "Cómo Funciona", href: "#como-funciona" },
  { label: "Contacto", href: "#contacto" },
];

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-steel-950 px-6 py-12 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/" className="flex items-center gap-2 text-white">
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 shrink-0">
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
            <span className="font-display text-xl font-bold tracking-tight uppercase">
              GC <span className="text-steel-300">Logistic</span>
            </span>
          </Link>
          <p className="mt-3 max-w-xs text-sm text-steel-400">
            Fulfillment ágil, preciso y a tu medida.
          </p>
        </div>

        <nav className="flex flex-wrap gap-x-8 gap-y-3">
          {FOOTER_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-steel-400 transition-colors hover:text-steel-50"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>

      <div className="mx-auto mt-10 max-w-7xl border-t border-white/10 pt-6">
        <p className="text-xs text-steel-500">
          © {new Date().getFullYear()} GC Logistic. Todos los derechos
          reservados.
        </p>
      </div>
    </footer>
  );
}
