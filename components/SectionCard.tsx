type Props = {
  title: string;
  children?: React.ReactNode;
};

export function SectionCard({ title, children }: Props) {
  return (
    <section className="rounded-lg bg-white p-4 shadow-sm border border-slate-200">
      <h2 className="text-sm font-semibold text-slate-700 mb-3">{title}</h2>
      {children ?? (
        <p className="text-xs text-slate-500">
          (Pendiente conectar a datos reales)
        </p>
      )}
    </section>
  );
}
