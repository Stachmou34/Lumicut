import { useState } from 'react'
import JSZip from 'jszip'
import { useAdminStore, KANBAN_COLUMNS, kanbanColumnOf } from '../../store/adminStore'
import { motifs } from '../../motifs/index'
import KanbanCard from './KanbanCard'
import OrderDetailModal from './OrderDetailModal'

// Télécharge un ZIP contenant tous les SVG des commandes "À produire"
async function downloadAllDXF(orders) {
  const toProduce = orders.filter(o => o.status === 'paid')
  if (toProduce.length === 0) {
    alert('Aucune commande à produire.')
    return
  }

  const zip = new JSZip()
  toProduce.forEach(order => {
    const motifId = order.config?.motif
    const motifData = motifs.find(m => m.id === motifId)
    const svgContent = motifData?.svg ?? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <text x="100" y="100" text-anchor="middle" fill="black">${motifId}</text>
    </svg>`
    zip.file(`${order.id}_${motifId}.svg`, svgContent)
  })

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `production_${new Date().toISOString().split('T')[0]}.zip`
  a.click()
  URL.revokeObjectURL(url)
}

// Kanban en 4 colonnes avec drag & drop HTML5
export default function KanbanBoard() {
  const orders = useAdminStore(s => s.orders)
  const moveOrderToKanbanColumn = useAdminStore(s => s.moveOrderToKanbanColumn)
  const [draggingId, setDraggingId] = useState(null)
  const [overColumn, setOverColumn] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)

  // Filtrer les commandes pertinentes pour la production
  const productionOrders = orders.filter(o =>
    o.status === 'paid' || o.status === 'in_production'
  )

  const handleDragStart = (orderId) => setDraggingId(orderId)

  const handleDragOver = (e, columnId) => {
    e.preventDefault()
    setOverColumn(columnId)
  }

  const handleDrop = (e, columnId) => {
    e.preventDefault()
    if (draggingId) {
      moveOrderToKanbanColumn(draggingId, columnId)
    }
    setDraggingId(null)
    setOverColumn(null)
  }

  const handleDragEnd = () => {
    setDraggingId(null)
    setOverColumn(null)
  }

  return (
    <>
      {/* Barre d'actions */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-400 text-sm">
          {productionOrders.length} commande{productionOrders.length !== 1 ? 's' : ''} en cours
        </p>
        <button
          onClick={() => downloadAllDXF(orders)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm
                     rounded-lg transition-colors font-medium"
        >
          ⬇ Tout télécharger (ZIP)
        </button>
      </div>

      {/* Colonnes kanban */}
      <div className="grid grid-cols-4 gap-4 items-start">
        {KANBAN_COLUMNS.map(col => {
          const colOrders = productionOrders.filter(o => kanbanColumnOf(o) === col.id)
          const isOver = overColumn === col.id

          return (
            <div
              key={col.id}
              onDragOver={e => handleDragOver(e, col.id)}
              onDrop={e => handleDrop(e, col.id)}
              onDragLeave={() => setOverColumn(null)}
              className={`rounded-xl border-2 transition-colors min-h-64 p-3 ${
                isOver ? 'border-violet-500/50 bg-violet-500/5' : `${col.color} bg-gray-900/50`
              }`}
            >
              {/* En-tête colonne */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold text-sm">{col.label}</h3>
                <span className="text-gray-400 text-xs bg-gray-800 px-2 py-0.5 rounded-full">
                  {colOrders.length}
                </span>
              </div>

              {/* Cartes */}
              <div className="space-y-3" onDragEnd={handleDragEnd}>
                {colOrders.map(order => (
                  <KanbanCard
                    key={order.id}
                    order={order}
                    onDragStart={handleDragStart}
                    onClick={() => setSelectedOrder(order)}
                  />
                ))}
                {colOrders.length === 0 && (
                  <div className="text-gray-600 text-xs text-center py-8 border border-dashed border-gray-800 rounded-lg">
                    Glissez une commande ici
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal détail */}
      {selectedOrder && (
        <OrderDetailModal
          order={orders.find(o => o.id === selectedOrder.id)}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </>
  )
}
