import { MATERIAL_LABELS, MOTIF_LABELS } from '../../store/adminStore'

// Carte d'une commande dans le kanban de production
export default function KanbanCard({ order, onDragStart, onClick }) {
  // Date limite = J+7 après la commande
  const deadline = new Date(order.created_at)
  deadline.setDate(deadline.getDate() + 7)
  const isUrgent = deadline < new Date()
  const daysLeft = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24))

  return (
    <div
      draggable
      onDragStart={() => onDragStart(order.id)}
      onClick={onClick}
      className={`bg-gray-900 rounded-xl border p-4 cursor-grab active:cursor-grabbing hover:border-gray-600
                  transition-colors select-none ${isUrgent ? 'border-red-500/50' : 'border-gray-700'}`}
    >
      {/* En-tête : ID + urgence */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400 text-xs font-mono">{order.id}</span>
        {isUrgent ? (
          <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-full">
            Urgent
          </span>
        ) : (
          <span className="text-xs text-gray-500">J{daysLeft >= 0 ? `-${daysLeft}` : `+${Math.abs(daysLeft)}`}</span>
        )}
      </div>

      {/* Client */}
      <p className="text-white font-semibold text-sm mb-1">{order.customer_name.split(' ')[0]}</p>
      <p className="text-gray-500 text-xs mb-3">{order.customer_address?.city}</p>

      {/* Aperçu motif (bloc coloré symbolique) */}
      <div className="h-16 rounded-lg bg-gray-800 flex items-center justify-center mb-3">
        <span className="text-2xl">
          {order.config?.motif === 'arbre-de-vie' ? '🌳' :
           order.config?.motif === 'mandala' ? '🔵' :
           order.config?.motif === 'cerf' ? '🦌' : '✦'}
        </span>
      </div>

      {/* Détails commande */}
      <div className="flex items-center justify-between text-xs">
        <div className="text-gray-400">
          <span className="text-white font-medium">{order.config?.size}</span>
          {' · '}
          {(MATERIAL_LABELS[order.config?.material] ?? order.config?.material)?.split(' ')[0]}
        </div>
        <span className="text-violet-400 font-semibold">{order.price_ttc} €</span>
      </div>

      {/* Délai */}
      <div className={`mt-2 text-xs ${isUrgent ? 'text-red-400' : 'text-gray-500'}`}>
        Deadline : {deadline.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
      </div>
    </div>
  )
}
