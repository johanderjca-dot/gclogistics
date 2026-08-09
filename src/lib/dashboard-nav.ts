import {
  LayoutDashboard,
  Boxes,
  ClipboardList,
  Truck,
  RotateCcw,
  CreditCard,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { label: string; href: string; icon: LucideIcon };

export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Principal",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Inventario", href: "/dashboard/inventario", icon: Boxes },
      { label: "Pedidos", href: "/dashboard/pedidos", icon: ClipboardList },
      {
        label: "Órdenes de Retiro",
        href: "/dashboard/retiros",
        icon: Truck,
      },
    ],
  },
  {
    label: "Gestión",
    items: [
      {
        label: "Devoluciones",
        href: "/dashboard/devoluciones",
        icon: RotateCcw,
      },
      {
        label: "Facturación",
        href: "/dashboard/facturacion",
        icon: CreditCard,
      },
      { label: "Reportes", href: "/dashboard/reportes", icon: BarChart3 },
    ],
  },
  {
    label: "Cuenta",
    items: [
      {
        label: "Configuración",
        href: "/dashboard/configuracion",
        icon: Settings,
      },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

export function titleForPath(pathname: string): string {
  const match = ALL_ITEMS.find((item) => item.href === pathname);
  return match?.label ?? "Dashboard";
}
