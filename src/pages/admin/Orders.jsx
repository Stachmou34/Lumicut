import { useState, useMemo } from 'react'
import { useAdminStore, STATUS_CONFIG, MATERIAL_LABELS } from '../../store/adminStore'
import OrderDetailModal from '../../components/admin/OrderDetailModal'
import { sendOrderEmail } from '../../lib/emailClient'

// Map statut → type d'email à envoyer
const EMAIL_TRIGGERS = {
  production: 'production',
  shipped:    'shipped',
}

// Badge de statut coloré
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status]
  if (!cfg) return null
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${cfg.badge}`}>
      {cfg.label}
    </span>
  )
}

export default function Orders() {
  const orders = useAdminStore(s => s.orders)
  const updateOrderStatus = useAdminStore(s => s.updateOrderStatus)

  const [selectedOrder, setSelectedOrder] = useState(null)
  const [filterStatus, setFilterStatus]   = useState('all')
  const [filterSize, setFilterSize]       = useState('all')
  const [search, setSearch]               = useState('')
  const [dateFrom, setDateFrom]           = useState('')
  const [dateTo, setDateTo]               = useState('')

  // Application des filtres
  const filtered = useMemo(() => {
    return orders.filter(o => {
      if (filterStatus !== 'all' && o.status !== filterStatus) return false
      if (filterSize !== 'all' && o.config?.size !== filterSize) return false
      if (dateFrom && o.created_at < dateFrom) return false
      if (dateTo   && o.created_at > dateTo + 'T23:59:59') return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !o.customer_name.toLowerCase().includes(q) &&
          !o.id.toLowerCase().includes(q) &&
          !o.customer_email.toLowerCase().includes(q)
        ) return false
      }
      return true
    })
  }, [orders, filterStatus, filterSize, dateFrom, dateTo, search])

  const totalCA = filtered
    .filter(o => o.status !== 'cancelled')
    .reduce((s, o) => s + (o.price_ttc ?? 0), 0)

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-1">Commandes</h1>
      <p className="text-gray-400 text-sm mb-6">
        {filtered.length} commande{filtered.length !== 1 ? 's' : ''}
        {' · '}
        CA filtré : <span className="text-white font-semibold">{totalCA.toFixed(0)} €</span>
      </p>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Recherche */}
        <input
          type="text"
          placeholder="Nom, ID, email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 w-52
                     focus:outline-none focus:border-violet-500 transition-colors"
        />

        {/* Statut */}
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2
                     focus:outline-none focus:border-violet-500"
        >
          <option value="all">Tous les statuts</option>
          {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
            <option key={val} value={val}>{cfg.label}</option>
          ))}
        </select>

        {/* Taille */}
        <select
          value={filterSize}
          onChange={e => setFilterSize(e.target.value)}
          className="bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2
                     focus:outline-none focus:border-violet-500"
        >
          <option value="all">Toutes les tailles</option>
          {['S', 'M', 'L', 'XL'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Date de */}
        <input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          className="bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2
                     focus:outline-none focus:border-violet-500"
        />
        <span className="text-gray-500 self-center text-sm">→</span>
        <input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          className="bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2
                     focus:outline-none focus:border-violet-500"
        />

        {/* Reset filtres */}
        {(filterStatus !== 'all' || filterSize !== 'all' || search || dateFrom || dateTo) && (
          <button
            onClick={() => {
              setFilterStatus('all')
              setFilterSize('all')
              setSearch('')
              setDateFrom('')
              setDateTo('')
            }}
            className="text-gray-400 hover:text-white text-sm px-3 py-2 border border-gray-700 rounded-lg
                       hover:bg-gray-800 transition-colors"
          >
            ✕ Réinitialiser
          </button>
        )}
      </div>

      {/* Tableau */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {['Commande', 'Date', 'Client', 'Panneau', 'Prix TTC', 'Statut', 'Actions'].map(h => (
                  <th key={h} className="text-left text-gray-400 font-medium px-4 py-3 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-gray-500 py-12">
                    Aucune commande ne correspond aux filtres
                  </td>
                </tr>
              )}
              {filtered.map(order => (
                <tr
                  key={order.id}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                >
                  {/* ID */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="text-violet-400 hover:text-violet-300 font-mono text-xs hover:underline"
                    >
                      {order.id}
                    </button>
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                    {new Date(order.created_at).toLocaleDateString('fr-FR', {
                      day: '2-digit', month: '2-digit', year: '2-digit',
                    })}
                  </td>

                  {/* Client */}
                  <td className="px-4 py-3">
                    <div className="text-white">{order.customer_name}</div>
                    <div className="text-gray-500 text-xs">{order.customer_address?.city}</div>
                  </td>

                  {/* Panneau */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {/* Miniature symbolique */}
                      <div className="w-9 h-9 bg-gray-800 rounded-lg flex items-center justify-center text-base flex-shrink-0">
                        {order.config?.motif === 'arbre-de-vie' ? '🌳' :
                         order.config?.motif === 'mandala' ? '🔵' :
                         order.config?.motif === 'cerf' ? '🦌' : '✦'}
                      </div>
                      <div>
                        <div className="text-white text-xs">{order.config?.size}</div>
                        <div className="text-gray-500 text-xs">
                          {(MATERIAL_LABELS[order.config?.material] ?? order.config?.material)?.split(' ').slice(0, 2).join(' ')}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Prix */}
                  <td className="px-4 py-3 text-white font-semibold whitespace-nowrap">
                    {order.price_ttc} €
                  </td>

                  {/* Statut */}
                  <td className="px-4 py-3">
                    <StatusBadge status={order.status} />
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="px-2.5 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white
                                   rounded-lg transition-colors border border-gray-700"
                        title="Voir le détail"
                      >
                        Détail
                      </button>

                      <select
                        value={order.status}
                        onChange={async e => {
                          const newStatus = e.target.value
                          updateOrderStatus(order.id, newStatus)
                          // Déclencher l'email correspondant si applicable
                          const emailType = EMAIL_TRIGGERS[newStatus]
                          if (emailType) {
                            sendOrderEmail(order.id, emailType).catch(err =>
                              console.warn('Email non envoyé (Edge Function non déployée) :', err.message)
                            )
                          }
                        }}
                        onClick={e => e.stopPropagation()}
                        className="px-2 py-1.5 text-xs bg-gray-800 border border-gray-700 text-gray-300 rounded-lg
                                   focus:outline-none focus:border-violet-500"
                        title="Changer le statut"
                      >
                        {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                          <option key={val} value={val}>{cfg.label}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal détail */}
      {selectedOrder && (
        <OrderDetailModal
          order={orders.find(o => o.id === selectedOrder.id)}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  )
}
