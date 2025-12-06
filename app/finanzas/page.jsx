import { Shell } from "../../components/Shell";
import { SectionCard } from "../../components/SectionCard";

export default function FinanzasPage() {
  return (
    <Shell>
      <h1 className="text-xl font-semibold mb-2">Finanzas</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="Resumen financiero" />
        <SectionCard title="Facturas y cobros" />
        <SectionCard title="Clientes morosos y bloqueos" />
        <SectionCard title="Reglas de pago y notificaciones" />
      </div>
    </Shell>
  );
}
