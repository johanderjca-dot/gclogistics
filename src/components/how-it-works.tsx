import { STEPS } from "@/lib/how-it-works-data";

export function HowItWorks() {
  return (
    <section
      id="como-funciona"
      className="bg-white px-6 py-24 sm:py-28 lg:px-10 lg:py-32"
    >
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <p className="mb-4 text-sm font-semibold tracking-[0.25em] text-steel-500 uppercase">
            Cómo Funciona
          </p>
          <h2 className="font-display text-4xl leading-[0.95] font-bold tracking-tight text-steel-950 uppercase sm:text-5xl lg:text-6xl">
            De tu bodega a la puerta
            <br />
            <span className="text-steel-500">en cuatro pasos</span>
          </h2>
        </div>

        <div className="relative mt-20 grid grid-cols-1 gap-12 lg:grid-cols-4 lg:gap-8">
          <div className="absolute inset-x-0 top-6 hidden h-px bg-steel-200 lg:block" />

          {STEPS.map((step, i) => (
            <div key={step.title} className="relative flex flex-col">
              <div className="font-display relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-steel-950 text-lg font-bold text-white">
                {String(i + 1).padStart(2, "0")}
              </div>
              <h3 className="font-display mt-6 text-xl font-bold tracking-tight text-steel-950">
                {step.title}
              </h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-steel-600">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-start gap-4 border-t border-steel-100 pt-10 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md text-sm text-steel-500">
            ¿Listo para dejar de preocuparte por tu logística?
          </p>
          <a
            href="#contacto"
            className="shrink-0 rounded-full bg-steel-950 px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-steel-800"
          >
            Solicitar Cotización
          </a>
        </div>
      </div>
    </section>
  );
}
