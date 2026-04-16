// Carte de KPI pour le dashboard admin
export default function KPICard({ label, value, sub, icon, accent = false }) {
  return (
    <div className={`rounded-xl border p-5 flex flex-col gap-1 ${
      accent
        ? 'bg-violet-600/10 border-violet-500/30'
        : 'bg-gray-900 border-gray-800'
    }`}>
      <div className="flex items-center justify-between">
        <span className="text-gray-400 text-sm">{label}</span>
        {icon && <span className="text-xl">{icon}</span>}
      </div>
      <div className={`text-2xl font-bold ${accent ? 'text-violet-300' : 'text-white'}`}>
        {value}
      </div>
      {sub && <div className="text-gray-500 text-xs">{sub}</div>}
    </div>
  )
}
