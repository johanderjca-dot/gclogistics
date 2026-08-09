import { DELIVERIES, DELIVERIES_TOTAL } from "@/lib/dashboard-data";

export function DeliveriesChart() {
  const max = Math.max(...DELIVERIES.flatMap((d) => [d.current, d.previous]));
  const diff =
    ((DELIVERIES_TOTAL.current - DELIVERIES_TOTAL.previous) /
      DELIVERIES_TOTAL.previous) *
    100;

  return (
    <div className="flex flex-1 flex-col rounded-3xl bg-white p-6 shadow-sm shadow-steel-900/5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold tracking-tight text-steel-950">
            Entregas: Este Mes vs. Mes Pasado
          </h2>
          <p className="mt-1 text-sm text-steel-500">
            {DELIVERIES_TOTAL.current} entregas este mes
            <span
              className={`ml-2 font-semibold ${diff >= 0 ? "text-steel-950" : "text-steel-500"}`}
            >
              {diff >= 0 ? "+" : ""}
              {diff.toFixed(1)}%
            </span>
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium text-steel-600">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-steel-950" />
            Este mes
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-steel-200" />
            Mes pasado
          </span>
        </div>
      </div>

      <div className="mt-8 flex flex-1 items-end justify-between gap-4 sm:gap-8">
        {DELIVERIES.map((week, i) => (
          <div
            key={week.label}
            className="flex flex-1 flex-col items-center gap-3"
          >
            <div className="flex h-48 w-full items-end justify-center gap-1.5 sm:gap-2">
              <div
                className="animate-rise w-3.5 rounded-full bg-steel-200 sm:w-5"
                style={{
                  height: `${(week.previous / max) * 100}%`,
                  animationDelay: `${i * 90}ms`,
                }}
              />
              <div
                className="animate-rise w-3.5 rounded-full bg-steel-950 sm:w-5"
                style={{
                  height: `${(week.current / max) * 100}%`,
                  animationDelay: `${i * 90 + 60}ms`,
                }}
              />
            </div>
            <span className="text-xs font-medium text-steel-500">
              {week.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
