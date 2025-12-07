// app/clientes/page.tsx
import { Shell } from "../../components/Shell";
import { ClientesGraphView } from "../../components/clientes/ClientesGraphView";

export default function ClientesPage() {
  return (
    <Shell>
      <ClientesGraphView />
    </Shell>
  );
}
