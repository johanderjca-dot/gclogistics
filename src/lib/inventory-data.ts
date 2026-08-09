export type InventoryStatus = "Disponible" | "Stock Bajo" | "Agotado";

export type InventoryItem = {
  id: string;
  name: string;
  sku: string;
  category: string;
  stock: number;
  reserved: number;
  location: string;
  status: InventoryStatus;
  updatedAt: string;
};

export const INVENTORY: InventoryItem[] = [
  {
    id: "1",
    name: "Auriculares Bluetooth X200",
    sku: "AUD-2201",
    category: "Electrónica",
    stock: 1240,
    reserved: 85,
    location: "Pasillo A-12",
    status: "Disponible",
    updatedAt: "Hace 2h",
  },
  {
    id: "2",
    name: "Cargador USB-C 20W",
    sku: "CHG-1145",
    category: "Electrónica",
    stock: 60,
    reserved: 40,
    location: "Pasillo A-14",
    status: "Stock Bajo",
    updatedAt: "Hace 5h",
  },
  {
    id: "3",
    name: "Mochila Antirrobo Urban",
    sku: "BAG-3390",
    category: "Accesorios",
    stock: 480,
    reserved: 20,
    location: "Pasillo B-03",
    status: "Disponible",
    updatedAt: "Hace 1d",
  },
  {
    id: "4",
    name: "Termo Acero Inoxidable 750ml",
    sku: "HOM-0512",
    category: "Hogar",
    stock: 0,
    reserved: 0,
    location: "Pasillo C-08",
    status: "Agotado",
    updatedAt: "Hace 3d",
  },
  {
    id: "5",
    name: "Smartwatch Fit Pro",
    sku: "ELE-7788",
    category: "Electrónica",
    stock: 320,
    reserved: 55,
    location: "Pasillo A-09",
    status: "Disponible",
    updatedAt: "Hace 6h",
  },
  {
    id: "6",
    name: "Set de Ollas Antiadherentes",
    sku: "HOM-2244",
    category: "Hogar",
    stock: 95,
    reserved: 10,
    location: "Pasillo C-02",
    status: "Stock Bajo",
    updatedAt: "Hace 12h",
  },
  {
    id: "7",
    name: "Lámpara LED Escritorio",
    sku: "HOM-3301",
    category: "Hogar",
    stock: 610,
    reserved: 30,
    location: "Pasillo C-15",
    status: "Disponible",
    updatedAt: "Hace 4h",
  },
  {
    id: "8",
    name: "Funda Protectora iPhone 15",
    sku: "ACC-5567",
    category: "Accesorios",
    stock: 150,
    reserved: 25,
    location: "Pasillo B-07",
    status: "Disponible",
    updatedAt: "Hace 8h",
  },
];

export const INVENTORY_SUMMARY = {
  totalSkus: INVENTORY.length,
  totalUnits: INVENTORY.reduce((sum, i) => sum + i.stock, 0),
  lowStock: INVENTORY.filter((i) => i.status === "Stock Bajo").length,
  outOfStock: INVENTORY.filter((i) => i.status === "Agotado").length,
};
