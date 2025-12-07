type ClientCardProps = {
  nombre: string;
  email: string;
  plan: string;
  estado: string;
};

export default function ClientCard({ nombre, email, plan, estado }: ClientCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{nombre}</h3>
      <p className="text-sm text-gray-600 mb-4">{email}</p>

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Plan: {plan}</span>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            estado === "Activo"
              ? "bg-green-100 text-green-800"
              : estado === "Moroso"
              ? "bg-red-100 text-red-800"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {estado}
        </span>
      </div>
    </div>
  );
}
