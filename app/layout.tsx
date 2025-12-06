import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SandíaShake CRM",
  description: "CRM y plataforma operativa para Sandía con Chile",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-100 text-slate-900">
        {children}
      </body>
    </html>
  );
}
