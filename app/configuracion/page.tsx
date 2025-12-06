import { Shell } from "../../components/Shell";
import { SectionCard } from "../../components/SectionCard";

export default function ConfiguracionPage() {
  return (
    <Shell>
      <h1 className="text-xl font-semibold mb-2">Configuración</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="Mi perfil" />
        <SectionCard title="Preferencias de notificación" />
        <SectionCard title="Integraciones (Google Drive, pasarela de pago)" />
        <SectionCard title="Parámetros del sistema" />
      </div>
    </Shell>
  );
}
