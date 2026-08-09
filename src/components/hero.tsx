import Image from "next/image";

export function Hero() {
  return (
    <section
      id="inicio"
      className="relative min-h-[92vh] w-full min-w-0 overflow-x-hidden bg-steel-950"
    >
      <Image
        src="https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=2400&q=80"
        alt="Bodega de fulfillment con estanterías de almacenamiento"
        fill
        priority
        className="object-cover"
        sizes="100vw"
      />

      {/* Duotone + directional overlay for brand cohesion */}
      <div className="absolute inset-0 bg-gradient-to-r from-steel-950 via-steel-950/70 to-steel-950/10" />
      <div className="absolute inset-0 bg-gradient-to-t from-steel-950 via-transparent to-transparent" />
      <div className="bg-grain absolute inset-0 opacity-[0.05]" />

      <div className="relative flex min-h-[92vh] w-full min-w-0 items-center">
        <div className="mx-auto w-full min-w-0 max-w-7xl px-6 pt-24 pb-20 lg:px-10">
          <div className="w-full min-w-0 max-w-3xl">
            <p
              className="animate-fade-up mb-5 text-xs font-semibold tracking-[0.25em] text-steel-300 uppercase sm:text-sm"
              style={{ animationDelay: "0ms" }}
            >
              Fulfillment ágil, preciso y a tu medida
            </p>

            <h1
              className="animate-fade-up font-display text-5xl leading-[0.92] font-bold tracking-tight text-steel-50 uppercase break-words sm:text-7xl lg:text-8xl"
              style={{ animationDelay: "120ms" }}
            >
              Fulfillment,
              <br />
              Almacenamiento
              <br />y <span className="text-steel-300">Gestión de Mercancía</span>
            </h1>

            <p
              className="animate-fade-up mt-6 max-w-xl text-base leading-relaxed text-steel-100/75 sm:text-lg"
              style={{ animationDelay: "240ms" }}
            >
              Recibimos, almacenamos y despachamos tus productos con precisión.
              Gestiona tu inventario y crea órdenes de retiro en tiempo real,
              desde un solo lugar.
            </p>

            <div
              className="animate-fade-up mt-9 flex flex-col gap-4 sm:flex-row"
              style={{ animationDelay: "360ms" }}
            >
              <a
                href="#nosotros"
                className="rounded-full bg-steel-100 px-8 py-3.5 text-center text-sm font-semibold text-steel-950 transition-colors hover:bg-white"
              >
                Conócenos
              </a>
              <a
                href="#servicios"
                className="rounded-full border border-steel-100/40 px-8 py-3.5 text-center text-sm font-semibold text-steel-50 transition-colors hover:border-steel-100 hover:bg-steel-100/10"
              >
                Nuestros Servicios
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
