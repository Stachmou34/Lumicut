import { useState } from 'react'
import { useAdminStore, STATUS_CONFIG, MATERIAL_LABELS, MOTIF_LABELS } from '../../store/adminStore'
import { motifs } from '../../motifs/index'

// Télécharge le SVG du motif comme fichier de production
function downloadProductionFile(order) {
  const motifId = order.config?.motif
  const motifData = motifs.find(m => m.id === motifId)
  const svgContent = motifData?.svg ?? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
    <rect width="400" height="300" fill="white"/>
    <text x="200" y="150" text-anchor="middle" font-size="24" fill="black">${motifId ?? 'Motif'}</text>
  </svg>`

  const blob = new Blob([svgContent], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${order.id}_${motifId ?? 'motif'}_production.svg`
  a.click()
  URL.revokeObjectURL(url)
}

// Génère et ouvre une fenêtre d'impression pour le bon de livraison
function printDeliveryNote(order) {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Bon de livraison ${order.id}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; color: #000; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    .subtitle { color: #666; font-size: 13px; margin-bottom: 32px; }
    .section { margin-bottom: 20px; }
    .section h2 { font-size: 14px; font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 10px; }
    .row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; }
    .label { color: #666; }
  </style>
</head>
<body>
  <h1>LumiCut — Bon de livraison</h1>
  <div class="subtitle">Commande ${order.id} · ${new Date(order.created_at).toLocaleDateString('fr-FR')}</div>

  <div class="section">
    <h2>Client</h2>
    <div class="row"><span class="label">Nom</span><span>${order.customer_name}</span></div>
    <div class="row"><span class="label">Email</span><span>${order.customer_email}</span></div>
    <div class="row"><span class="label">Adresse</span><span>${order.customer_address?.street}, ${order.customer_address?.zip} ${order.customer_address?.city}</span></div>
  </div>

  <div class="section">
    <h2>Commande</h2>
    <div class="row"><span class="label">Taille</span><span>${order.config?.size}</span></div>
    <div class="row"><span class="label">Matériau</span><span>${MATERIAL_LABELS[order.config?.material] ?? order.config?.material}</span></div>
    <div class="row"><span class="label">Motif</span><span>${MOTIF_LABELS[order.config?.motif] ?? order.config?.motif}</span></div>
    <div class="row"><span class="label">LED</span><span>${order.config?.led}</span></div>
    ${order.config?.engraving ? `<div class="row"><span class="label">Gravure</span><span>${order.config.engraving}</span></div>` : ''}
  </div>

  <div class="section">
    <h2>Prix</h2>
    <div class="row"><span class="label">Prix HT</span><span>${order.price_ht?.toFixed(2)} €</span></div>
    <div class="row"><span class="label">TVA (20%)</span><span>${((order.price_ttc ?? 0) - (order.price_ht ?? 0)).toFixed(2)} €</span></div>
    <div class="row"><span><strong>Total TTC</strong></span><span><strong>${order.price_ttc?.toFixed(2)} €</strong></span></div>
  </div>
</body>
</html>`

  const win = window.open('', '_blank')
  win.document.write(html)
  win.document.close()
  win.print()
}

// Modal de détail d'une commande
export default function OrderDetailModal({ order, onClose }) {
  const updateOrderStatus = useAdminStore(s => s.updateOrderStatus)
  const updateOrderNotes = useAdminStore(s => s.updateOrderNotes)
  const [notes, setNotes] = useState(order.notes ?? '')
  const [notesSaved, setNotesSaved] = useState(false)

  if (!order) return null

  const handleStatusChange = (e) => {
    updateOrderStatus(order.id, e.target.value)
  }

  const handleSaveNotes = () => {
    updateOrderNotes(order.id, notes)
    setNotesSaved(true)
    setTimeout(() => setNotesSaved(false), 2000)
  }

  const handleOpenEmail = () => {
    const subject = encodeURIComponent(`Votre commande LumiCut ${order.id}`)
    const body = encodeURIComponent(`Bonjour ${order.customer_name.split(' ')[0]},\n\nConcernant votre commande ${order.id}...\n\nCordialement,\nL'équipe LumiCut`)
    window.open(`mailto:${order.customer_email}?subject=${subject}&body=${body}`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* En-tête */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div>
            <h2 className="text-white font-bold text-lg">{order.id}</h2>
            <p className="text-gray-400 text-sm">
              {order.customer_name} · {order.customer_address?.city} ·{' '}
              {new Date(order.created_at).toLocaleDateString('fr-FR', {
                day: '2-digit', month: 'long', year: 'numeric',
              })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Statut + actions */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={order.status}
              onChange={handleStatusChange}
              className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2
                         focus:outline-none focus:border-violet-500"
            >
              {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                <option key={val} value={val}>{cfg.label}</option>
              ))}
            </select>

            <button
              onClick={() => downloadProductionFile(order)}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700
                         text-white text-sm rounded-lg transition-colors"
            >
              ⬇ DXF production
            </button>

            <button
              onClick={() => printDeliveryNote(order)}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700
                         text-white text-sm rounded-lg transition-colors"
            >
              🖨 Bon de livraison
            </button>

            <button
              onClick={handleOpenEmail}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700
                         text-white text-sm rounded-lg transition-colors"
            >
              ✉ Email client
            </button>
          </div>

          {/* Configuration du panneau */}
          <section>
            <h3 className="text-gray-300 font-semibold text-sm mb-3 uppercase tracking-wider">
              Configuration du panneau
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                ['Taille', order.config?.size],
                ['Matériau', MATERIAL_LABELS[order.config?.material] ?? order.config?.material],
                ['Motif', MOTIF_LABELS[order.config?.motif] ?? order.config?.motif],
                ['LED', order.config?.led],
                ['Variateur', order.config?.dimmer ? 'Oui' : 'Non'],
                ['Gravure', order.config?.engraving || '—'],
              ].map(([label, val]) => (
                <div key={label} className="bg-gray-800 rounded-lg px-3 py-2.5">
                  <span className="text-gray-500 block text-xs">{label}</span>
                  <span className="text-white font-medium">{val}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Adresse de livraison */}
          <section>
            <h3 className="text-gray-300 font-semibold text-sm mb-3 uppercase tracking-wider">
              Livraison
            </h3>
            <div className="bg-gray-800 rounded-lg px-4 py-3 text-sm text-white space-y-0.5">
              <p>{order.customer_name}</p>
              <p>{order.customer_address?.street}</p>
              <p>{order.customer_address?.zip} {order.customer_address?.city}</p>
              <p className="text-gray-400 text-xs mt-1">{order.customer_email}</p>
            </div>
          </section>

          {/* Prix */}
          <section>
            <h3 className="text-gray-300 font-semibold text-sm mb-3 uppercase tracking-wider">Prix</h3>
            <div className="bg-gray-800 rounded-lg px-4 py-3 text-sm flex justify-between">
              <div className="space-y-1">
                <p className="text-gray-400">HT</p>
                <p className="text-gray-400">TVA 20%</p>
                <p className="text-white font-semibold">TTC</p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-white">{order.price_ht?.toFixed(2)} €</p>
                <p className="text-white">{((order.price_ttc ?? 0) - (order.price_ht ?? 0)).toFixed(2)} €</p>
                <p className="text-white font-semibold">{order.price_ttc?.toFixed(2)} €</p>
              </div>
            </div>
          </section>

          {/* Historique des statuts */}
          <section>
            <h3 className="text-gray-300 font-semibold text-sm mb-3 uppercase tracking-wider">
              Historique
            </h3>
            <div className="space-y-2">
              {[...order.status_history].reverse().map((entry, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_CONFIG[entry.status]?.badge ?? 'bg-gray-700 text-gray-300'}`}>
                    {STATUS_CONFIG[entry.status]?.label ?? entry.status}
                  </span>
                  <span className="text-gray-500 text-xs">
                    {new Date(entry.timestamp).toLocaleString('fr-FR', {
                      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Notes internes */}
          <section>
            <h3 className="text-gray-300 font-semibold text-sm mb-3 uppercase tracking-wider">
              Notes internes
            </h3>
            <div className="space-y-2">
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="Notes pour l'équipe de production..."
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2.5
                           resize-none focus:outline-none focus:border-violet-500 transition-colors"
              />
              <button
                onClick={handleSaveNotes}
                className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg transition-colors"
              >
                {notesSaved ? '✓ Sauvegardé' : 'Sauvegarder'}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
