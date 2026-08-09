import { Truck, Boxes, CreditCard, RotateCcw } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { DeliveriesChart } from "@/components/dashboard/deliveries-chart";
import { STATS } from "@/lib/dashboard-data";

const ICONS = {
  despachados: Truck,
  stock: Boxes,
  credito: CreditCard,
  devoluciones: RotateCcw,
};

export default function DashboardPage() {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {STATS.map((stat) => (
          <StatCard
            key={stat.id}
            stat={stat}
            icon={ICONS[stat.id as keyof typeof ICONS]}
          />
        ))}
      </div>

      <DeliveriesChart />
    </>
  );
}
