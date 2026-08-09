import type { Metadata } from "next";
import { Archivo, Big_Shoulders } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const bigShoulders = Big_Shoulders({
  variable: "--font-shoulders",
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "GC Logistic | Fulfillment confiable para tu e-commerce",
  description:
    "Almacenamos, gestionamos y despachamos tu inventario. Crea órdenes de retiro y da seguimiento a tus productos en tiempo real con GC Logistic.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${archivo.variable} ${bigShoulders.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col overflow-x-hidden bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
