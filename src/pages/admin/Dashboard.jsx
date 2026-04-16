import { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts'
import { useAdminStore, MATERIAL_LABELS, MOTIF_LABELS } from '../../store/adminStore'
import KPICard from '../../components/admin/KPICard'

// Couleurs pour les graphiques
const CHART_COLORS = ['#7c3aed', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe']
const PIE_COLORS   = ['#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95']

// Tooltip personnalisé pour les graphiques
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-white font-semibold">
          {p.name === 'ca' ? `${p.value} €` : p.value}
        </p>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const orders = useAdminStore(s => s.orders)
  const today  = '2026-04-16'

  // ── KPIs ──
  const kpis = useMemo(() => {
    const todayOrders  = orders.filter(o => o.created_at.startsWith(today) && o.status !== 'cancelled')
    const monthOrders  = orders.filter(o => o.created_at.startsWith('2026-04') && o.status !== 'cancelled')
    const weekOrders   = orders.filter(o => {
      const d = new Date(o.created_at)
      const ref = new Date(today)
      return d >= new Date(ref.getTime() - 7 * 86400000) && o.status !== 'cancelled'
    })
    const pending      = orders.filter(o => o.status === 'paid')

    // Délai moyen (livraisons uniquement)
    const delivered    = orders.filter(o => o.status === 'delivered')
    let avgDelay = 0
    if (delivered.length) {
      const delays = delivered.map(o => {
        const created   = new Date(o.created_at)
        const shipped   = o.status_history.find(h => h.status === 'delivered')
        if (!shipped) return 0
        return Math.ceil((new Date(shipped.timestamp) - created) / 86400000)
      })
      avgDelay = Math.round(delays.reduce((a, b) => a + b, 0) / delays.length)
    }

    return {
      todayCount: todayOrders.length,
      todayCA: todayOrders.reduce((s, o) => s + (o.price_ttc ?? 0), 0),
      weekCount: weekOrders.length,
      monthCA: monthOrders.reduce((s, o) => s + (o.price_ttc ?? 0), 0),
      pendingCount: pending.length,
      avgDelay,
    }
  }, [orders])

  // ── Données graphiques ──
  const chartData = useMemo(() => {
    const validOrders = orders.filter(o => o.status !== 'cancelled')

    // Courbe CA sur 30 jours
    const caPerDay = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      const ca = validOrders
        .filter(o => o.created_at.startsWith(key))
        .reduce((s, o) => s + (o.price_ttc ?? 0), 0)
      caPerDay.push({
        date: d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        ca,
      })
    }

    // Camembert : répartition des tailles
    const sizeMap = {}
    validOrders.forEach(o => {
      const s = o.config?.size ?? '?'
      sizeMap[s] = (sizeMap[s] ?? 0) + 1
    })
    const sizeData = ['S', 'M', 'L', 'XL']
      .filter(s => sizeMap[s])
      .map(s => ({ name: s, value: sizeMap[s] }))

    // Barres : motifs
    const motifMap = {}
    validOrders.forEach(o => {
      const m = MOTIF_LABELS[o.config?.motif] ?? o.config?.motif ?? '?'
      motifMap[m] = (motifMap[m] ?? 0) + 1
    })
    const motifData = Object.entries(motifMap)
      .map(([motif, count]) => ({ motif, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Barres : matériaux
    const matMap = {}
    validOrders.forEach(o => {
      const m = MATERIAL_LABELS[o.config?.material] ?? o.config?.material ?? '?'
      matMap[m] = (matMap[m] ?? 0) + 1
    })
    const matData = Object.entries(matMap).map(([material, count]) => ({ material, count }))

    return { caPerDay, sizeData, motifData, matData }
  }, [orders])

  // ── Alertes ──
  const pendingOldCount = orders.filter(o => {
    if (o.status !== 'paid') return false
    const days = (new Date() - new Date(o.created_at)) / 86400000
    return days > 2
  }).length

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-1">Vue d'ensemble</h1>
      <p className="text-gray-400 text-sm mb-6">
        {new Date(today).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </p>

      {/* Alertes */}
      {pendingOldCount > 3 && (
        <div className="mb-4 bg-orange-500/10 border border-orange-500/30 text-orange-300 rounded-xl px-4 py-3 text-sm">
          ⚠ {pendingOldCount} commandes payées en attente de production depuis plus de 2 jours
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <KPICard label="Commandes aujourd'hui" value={kpis.todayCount}    icon="📦" />
        <KPICard label="CA aujourd'hui"        value={`${kpis.todayCA} €`} icon="💶" accent />
        <KPICard label="Commandes cette semaine" value={kpis.weekCount}   icon="📅" />
        <KPICard label="CA ce mois"            value={`${kpis.monthCA} €`} icon="📊" accent />
        <KPICard label="En attente de production" value={kpis.pendingCount} icon="⚙️" />
        <KPICard label="Délai moyen livraison" value={`${kpis.avgDelay} j`} icon="🚚" />
      </div>

      {/* Graphiques — rangée 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Courbe CA 30 jours (occupe 2/3) */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">CA sur 30 jours</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData.caPerDay} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#6b7280', fontSize: 10 }}
                tickLine={false}
                interval={4}
              />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="ca"
                stroke="#7c3aed"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#7c3aed' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Camembert tailles */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Répartition des tailles</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={chartData.sizeData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                labelLine={false}
              >
                {chartData.sizeData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value} cmd`, '']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Graphiques — rangée 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top motifs */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Top motifs commandés</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData.motifData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis dataKey="motif" tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Commandes" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Matériaux */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Répartition des matériaux</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData.matData} layout="vertical" margin={{ top: 5, right: 10, left: 80, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis dataKey="material" type="category" tick={{ fill: '#9ca3af', fontSize: 11 }} tickLine={false} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Commandes" fill="#a78bfa" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
