import { Boxes, Layers, TriangleAlert, CircleX, Search, SlidersHorizontal } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { INVENTORY, INVENTORY_SUMMARY } from "@/lib/inventory-data";

const SUMMARY_CARDS = [
  {
    label: "SKUs Activos",
    value: INVENTORY_SUMMARY.totalSkus.toString(),
    icon: Boxes,
  },
  {
    label: "Unidades en Stock",
    value: INVENTORY_SUMMARY.totalUnits.toLocaleString("es"),
    icon: Layers,
  },
  {
    label: "Stock Bajo",
    value: INVENTORY_SUMMARY.lowStock.toString(),
    icon: TriangleAlert,
  },
  {
    label: "Agotados",
    value: INVENTORY_SUMMARY.outOfStock.toString(),
    icon: CircleX,
  },
];

export default function InventarioPage() {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {SUMMARY_CARDS.map((card) => (
          <div
            key={card.label}
            className="rounded-3xl bg-white p-5 shadow-sm shadow-steel-900/5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-steel-50 text-steel-700">
              <card.icon className="h-[18px] w-[18px]" strokeWidth={2} />
            </div>
            <p className="mt-5 text-sm font-medium text-steel-500">
              {card.label}
            </p>
            <p className="font-display mt-1 text-3xl font-bold tracking-tight text-steel-950">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-1 flex-col rounded-3xl bg-white p-6 shadow-sm shadow-steel-900/5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-lg font-bold tracking-tight text-steel-950">
            Productos
          </h2>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full bg-steel-50 px-4 py-2.5">
              <Search className="h-4 w-4 shrink-0 text-steel-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o SKU…"
                className="w-full bg-transparent text-sm text-steel-800 placeholder:text-steel-400 focus:outline-none sm:w-56"
              />
            </div>
            <button
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-steel-50 text-steel-600 transition-colors hover:bg-steel-100"
              aria-label="Filtros"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-6 -mx-6 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-steel-100">
                <th className="px-6 py-3 text-xs font-semibold tracking-wide text-steel-500 uppercase">
                  Producto
                </th>
                <th className="px-3 py-3 text-xs font-semibold tracking-wide text-steel-500 uppercase">
                  Categoría
                </th>
                <th className="px-3 py-3 text-right text-xs font-semibold tracking-wide text-steel-500 uppercase">
                  Stock
                </th>
                <th className="px-3 py-3 text-right text-xs font-semibold tracking-wide text-steel-500 uppercase">
                  Reservado
                </th>
                <th className="px-3 py-3 text-xs font-semibold tracking-wide text-steel-500 uppercase">
                  Ubicación
                </th>
                <th className="px-3 py-3 text-xs font-semibold tracking-wide text-steel-500 uppercase">
                  Estado
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold tracking-wide text-steel-500 uppercase">
                  Actualizado
                </th>
              </tr>
            </thead>
            <tbody>
              {INVENTORY.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-steel-50 last:border-0 hover:bg-steel-50/60"
                >
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-steel-950">
                      {item.name}
                    </p>
                    <p className="text-xs text-steel-500">{item.sku}</p>
                  </td>
                  <td className="px-3 py-4 text-sm text-steel-600">
                    {item.category}
                  </td>
                  <td className="px-3 py-4 text-right text-sm font-medium text-steel-950">
                    {item.stock.toLocaleString("es")}
                  </td>
                  <td className="px-3 py-4 text-right text-sm text-steel-500">
                    {item.reserved.toLocaleString("es")}
                  </td>
                  <td className="px-3 py-4 text-sm text-steel-600">
                    {item.location}
                  </td>
                  <td className="px-3 py-4">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-steel-500">
                    {item.updatedAt}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
