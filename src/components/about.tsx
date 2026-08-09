import Image from "next/image";
import { Boxes } from "lucide-react";
import { ABOUT_STATS } from "@/lib/about-data";

export function About() {
  return (
    <section
      id="nosotros"
      className="bg-white px-6 py-24 sm:py-28 lg:px-10 lg:py-32"
    >
      <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2 lg:gap-20">
        <div className="relative">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl bg-steel-950 sm:max-w-md lg:max-w-none">
            <Image
              src="https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=1200&q=80"
              alt="Interior de la bodega de GC Logistic"
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 40vw, 90vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-steel-950/50 via-transparent to-transparent" />
          </div>

          <div className="absolute -right-4 -bottom-6 flex items-center gap-4 rounded-2xl bg-white p-5 shadow-lg shadow-steel-900/10 sm:-right-8 sm:p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-steel-950 text-white">
              <Boxes className="h-5 w-5" strokeWidth={2} />
            </div>
            <div>
              <p className="font-display text-2xl leading-none font-bold text-steel-950">
                +8 años
              </p>
              <p className="mt-1 text-xs text-steel-500">
                de experiencia en fulfillment
              </p>
            </div>
          </div>
        </div>

        <div>
          <p className="mb-4 text-sm font-semibold tracking-[0.25em] text-steel-500 uppercase">
            Nosotros
          </p>
          <h2 className="font-display text-4xl leading-[0.95] font-bold tracking-tight text-steel-950 uppercase sm:text-5xl lg:text-6xl">
            Operamos tu logística
            <br />
            como si fuera <span className="text-steel-500">nuestra</span>
          </h2>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-steel-600 sm:text-lg">
            En GC Logistic combinamos infraestructura, tecnología y un equipo
            operativo dedicado para que cada pedido salga a tiempo y cada
            unidad de tu inventario esté donde debe estar. Trabajamos como
            una extensión de tu equipo, no como un proveedor más.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-x-8 gap-y-8 border-t border-steel-100 pt-10">
            {ABOUT_STATS.map((stat) => (
              <div key={stat.label}>
                <p className="font-display text-3xl font-bold tracking-tight text-steel-950 sm:text-4xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-steel-500">{stat.label}</p>
              </div>
            ))}
          </div>

          <a
            href="#contacto"
            className="mt-10 inline-block rounded-full bg-steel-950 px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-steel-800"
          >
            Habla con Nosotros
          </a>
        </div>
      </div>
    </section>
  );
}
