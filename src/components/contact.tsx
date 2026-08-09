"use client";

import { useState, type FormEvent } from "react";
import { Mail, Phone, MapPin } from "lucide-react";

const CONTACT_INFO = [
  { icon: Mail, label: "Correo", value: "contacto@gclogistic.com" },
  { icon: Phone, label: "Teléfono", value: "+1 (555) 018-2045" },
  { icon: MapPin, label: "Ubicación", value: "Zona Franca Industrial" },
];

export function Contact() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <section
      id="contacto"
      className="bg-steel-950 px-6 py-24 sm:py-28 lg:px-10 lg:py-32"
    >
      <div className="mx-auto grid max-w-7xl gap-16 lg:grid-cols-2 lg:gap-20">
        <div>
          <p className="mb-4 text-sm font-semibold tracking-[0.25em] text-steel-400 uppercase">
            Contacto
          </p>
          <h2 className="font-display text-4xl leading-[0.95] font-bold tracking-tight text-steel-50 uppercase sm:text-5xl lg:text-6xl">
            Hablemos de
            <br />
            <span className="text-steel-400">tu operación</span>
          </h2>
          <p className="mt-6 max-w-md text-base leading-relaxed text-steel-300 sm:text-lg">
            Cuéntanos sobre tu volumen de pedidos y tus necesidades. Te
            respondemos con una propuesta a la medida de tu negocio.
          </p>

          <div className="mt-10 flex flex-col gap-5">
            {CONTACT_INFO.map((item) => (
              <div key={item.label} className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/5 text-steel-300">
                  <item.icon className="h-[18px] w-[18px]" strokeWidth={2} />
                </div>
                <div>
                  <p className="text-xs text-steel-500">{item.label}</p>
                  <p className="text-sm font-medium text-steel-100">
                    {item.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-white p-8 sm:p-10">
          {submitted ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <h3 className="font-display text-2xl font-bold tracking-tight text-steel-950">
                ¡Solicitud enviada!
              </h3>
              <p className="mt-2 max-w-xs text-sm text-steel-500">
                Gracias por escribirnos. Nuestro equipo te contactará muy
                pronto.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <input
                  type="text"
                  placeholder="Nombre completo"
                  required
                  className="w-full rounded-xl bg-steel-50 px-4 py-3.5 text-sm text-steel-900 placeholder:text-steel-400 focus:outline-2 focus:outline-steel-300"
                />
                <input
                  type="text"
                  placeholder="Empresa"
                  className="w-full rounded-xl bg-steel-50 px-4 py-3.5 text-sm text-steel-900 placeholder:text-steel-400 focus:outline-2 focus:outline-steel-300"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <input
                  type="email"
                  placeholder="Correo electrónico"
                  required
                  className="w-full rounded-xl bg-steel-50 px-4 py-3.5 text-sm text-steel-900 placeholder:text-steel-400 focus:outline-2 focus:outline-steel-300"
                />
                <input
                  type="tel"
                  placeholder="Teléfono"
                  className="w-full rounded-xl bg-steel-50 px-4 py-3.5 text-sm text-steel-900 placeholder:text-steel-400 focus:outline-2 focus:outline-steel-300"
                />
              </div>
              <textarea
                placeholder="Cuéntanos sobre tu operación (volumen de pedidos, tipo de producto, etc.)"
                rows={4}
                className="w-full resize-none rounded-xl bg-steel-50 px-4 py-3.5 text-sm text-steel-900 placeholder:text-steel-400 focus:outline-2 focus:outline-steel-300"
              />

              <button
                type="submit"
                className="mt-2 rounded-full bg-steel-950 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-steel-800"
              >
                Enviar Solicitud
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
