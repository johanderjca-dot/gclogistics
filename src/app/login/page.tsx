"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/auth/auth-layout";

export default function LoginPage() {
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push("/dashboard");
  }

  return (
    <AuthLayout
      topRight={
        <>
          ¿No tienes acceso?{" "}
          <Link
            href="/registro"
            className="rounded-full border border-steel-200 px-4 py-2 font-semibold text-steel-950 hover:bg-steel-50"
          >
            Regístrate
          </Link>
        </>
      }
    >
      <h1 className="font-display text-3xl font-bold tracking-tight text-steel-950 sm:text-4xl">
        Iniciar Sesión
      </h1>
      <p className="mt-2 text-sm text-steel-500">
        Accede a tu inventario, pedidos y órdenes de retiro.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <input
          id="email"
          type="email"
          placeholder="Correo electrónico"
          className="w-full rounded-xl bg-steel-50 px-4 py-3.5 text-sm text-steel-900 placeholder:text-steel-400 focus:outline-2 focus:outline-steel-300"
        />
        <input
          id="password"
          type="password"
          placeholder="Contraseña"
          className="w-full rounded-xl bg-steel-50 px-4 py-3.5 text-sm text-steel-900 placeholder:text-steel-400 focus:outline-2 focus:outline-steel-300"
        />

        <div className="flex justify-end">
          <Link
            href="#"
            className="text-sm font-medium text-steel-500 hover:text-steel-950"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <button
          type="submit"
          className="mt-2 rounded-full bg-steel-950 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-steel-800"
        >
          Ingresar
        </button>
      </form>
    </AuthLayout>
  );
}
