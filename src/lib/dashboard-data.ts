export type Stat = {
  id: string;
  label: string;
  value: string;
  helper: string;
  trend: number;
  tone: "dark" | "mid" | "base" | "light";
};

export const STATS: Stat[] = [
  {
    id: "despachados",
    label: "Pedidos Despachados",
    value: "1,284",
    helper: "este mes",
    trend: 12.4,
    tone: "dark",
  },
  {
    id: "stock",
    label: "Stock Total",
    value: "48,920",
    helper: "unidades en inventario",
    trend: 3.1,
    tone: "mid",
  },
  {
    id: "credito",
    label: "Crédito Pendiente",
    value: "$18,450",
    helper: "por cobrar",
    trend: -5.2,
    tone: "base",
  },
  {
    id: "devoluciones",
    label: "Devoluciones",
    value: "37",
    helper: "este mes",
    trend: -8.6,
    tone: "light",
  },
];

export const DELIVERIES = [
  { label: "Sem 1", current: 62, previous: 54 },
  { label: "Sem 2", current: 78, previous: 65 },
  { label: "Sem 3", current: 85, previous: 90 },
  { label: "Sem 4", current: 97, previous: 80 },
];

export const DELIVERIES_TOTAL = {
  current: DELIVERIES.reduce((sum, d) => sum + d.current, 0),
  previous: DELIVERIES.reduce((sum, d) => sum + d.previous, 0),
};
