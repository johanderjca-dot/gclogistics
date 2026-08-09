import Link from "next/link";
import { AuthLayout } from "@/components/auth/auth-layout";

export default function RegistroPage() {
  return (
    <AuthLayout
      topRight={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/login"
            className="rounded-full border border-steel-200 px-4 py-2 font-semibold text-steel-950 hover:bg-steel-50"
          >
            Inicia Sesión
          </Link>
        </>
      }
    >
      <h1 className="font-display text-3xl font-bold tracking-tight text-steel-950 sm:text-4xl">
        Crear Cuenta
      </h1>
      <p className="mt-2 text-sm text-steel-500">
        Regístrate para gestionar tu inventario y pedidos con GC Logistic.
      </p>

      <form className="mt-8 flex flex-col gap-4">
        <input
          id="name"
          type="text"
          placeholder="Nombre completo"
          className="w-full rounded-xl bg-steel-50 px-4 py-3.5 text-sm text-steel-900 placeholder:text-steel-400 focus:outline-2 focus:outline-steel-300"
        />
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

        <button
          type="submit"
          className="mt-2 rounded-full bg-steel-950 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-steel-800"
        >
          Crear Cuenta
        </button>
      </form>
    </AuthLayout>
  );
}
