import { Shell } from "../../components/Shell";
import { SectionCard } from "../../components/SectionCard";

export default function ColaboradoresPage() {
  return (
    <Shell>
      <h1 className="text-xl font-semibold mb-2">Colaboradores y Admins</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="Administradores (CRUD)" />
        <SectionCard title="Colaboradores (CRUD y asignación a clientes)" />
        <SectionCard title="Chilli Points y premios" />
        <SectionCard title="Salud mental (detalle colaborador)" />
      </div>
    </Shell>
  );
}
