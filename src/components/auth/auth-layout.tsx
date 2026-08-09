import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

function Mark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`h-6 w-6 shrink-0 ${className}`}
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

export function AuthLayout({
  topRight,
  children,
}: {
  topRight: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-white">
      <div className="relative hidden w-1/2 lg:block">
        <Image
          src="https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=1600&q=80"
          alt="Estantería de bodega de fulfillment"
          fill
          priority
          className="object-cover"
          sizes="50vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-steel-950/70 via-steel-950/10 to-steel-950/40" />

        <Link
          href="/"
          className="absolute bottom-8 left-8 flex items-center gap-2 text-white"
        >
          <Mark />
          <span className="font-display text-xl font-bold tracking-tight uppercase">
            GC <span className="text-steel-300">Logistic</span>
          </span>
        </Link>
      </div>

      <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-12 lg:w-1/2 lg:px-20">
        <div className="mb-10 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-steel-950 lg:hidden"
          >
            <Mark />
            <span className="font-display text-xl font-bold tracking-tight uppercase">
              GC <span className="text-steel-500">Logistic</span>
            </span>
          </Link>

          <div className="ml-auto text-sm text-steel-500">{topRight}</div>
        </div>

        <div className="mx-auto w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
