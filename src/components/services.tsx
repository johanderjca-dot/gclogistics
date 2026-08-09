import {
  Warehouse,
  ScanBarcode,
  PackageCheck,
  Truck,
  RotateCcw,
  Plug,
  type LucideIcon,
} from "lucide-react";
import { SERVICES } from "@/lib/services-data";

const ICONS: Record<string, LucideIcon> = {
  Warehouse,
  ScanBarcode,
  PackageCheck,
  Truck,
  RotateCcw,
  Plug,
};

export function Services() {
  return (
    <section
      id="servicios"
      className="bg-steel-950 px-6 py-24 sm:py-28 lg:px-10 lg:py-32"
    >
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <p className="mb-4 text-sm font-semibold tracking-[0.25em] text-steel-400 uppercase">
            Servicios
          </p>
          <h2 className="font-display text-4xl leading-[0.95] font-bold tracking-tight text-steel-50 uppercase sm:text-5xl lg:text-6xl">
            Todo lo que tu inventario
            <br />
            necesita, <span className="text-steel-400">en un solo lugar</span>
          </h2>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-steel-300 sm:text-lg">
            Desde que tu mercancía llega a nuestra bodega hasta que el
            cliente final la recibe, cubrimos cada paso de la cadena de
            fulfillment.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service) => {
            const Icon = ICONS[service.icon];
            return (
              <div
                key={service.title}
                className="group rounded-3xl border border-white/5 bg-steel-900 p-7 transition-colors hover:border-steel-300/30 hover:bg-steel-800"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-steel-300/10 text-steel-300 transition-colors group-hover:bg-steel-300 group-hover:text-steel-950">
                  <Icon className="h-[22px] w-[22px]" strokeWidth={2} />
                </div>
                <h3 className="font-display mt-6 text-xl font-bold tracking-tight text-steel-50">
                  {service.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-steel-400">
                  {service.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-14 flex flex-col items-start gap-4 border-t border-white/10 pt-10 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md text-sm text-steel-400">
            ¿No estás seguro de qué necesitas? Cuéntanos sobre tu operación y
            armamos un plan a tu medida.
          </p>
          <a
            href="#contacto"
            className="shrink-0 rounded-full bg-steel-100 px-8 py-3.5 text-sm font-semibold text-steel-950 transition-colors hover:bg-white"
          >
            Solicitar Cotización
          </a>
        </div>
      </div>
    </section>
  );
}
