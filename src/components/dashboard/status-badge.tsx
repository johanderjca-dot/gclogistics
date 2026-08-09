import type { InventoryStatus } from "@/lib/inventory-data";

const STYLES: Record<InventoryStatus, { badge: string; dot: string }> = {
  Disponible: {
    badge: "bg-steel-50 text-steel-600",
    dot: "bg-steel-400",
  },
  "Stock Bajo": {
    badge: "bg-steel-100 text-steel-800",
    dot: "bg-steel-600",
  },
  Agotado: {
    badge: "bg-steel-950 text-white",
    dot: "bg-white",
  },
};

export function StatusBadge({ status }: { status: InventoryStatus }) {
  const style = STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${style.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {status}
    </span>
  );
}
