import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { sendOrderEmail } from '../../lib/emailClient'

const TYPE_LABELS = {
  confirmation:    { label: 'Confirmation',   emoji: '✅' },
  production:      { label: 'En production',  emoji: '⚡' },
  shipped:         { label: 'Expédié',        emoji: '📦' },
  review_request:  { label: 'Demande d\'avis', emoji: '⭐' },
  referral_reward: { label: 'Parrainage',     emoji: '🎁' },
}

export default function EmailLogs() {
  const [logs, setLogs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [resending, setResending] = useState(null)
  const [filter, setFilter]   = useState('all')

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('email_logs')
      .select('*, orders(customer_name, customer_email)')
      .order('sent_at', { ascending: false })
      .limit(100)
    setLogs(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function resend(log) {
    setResending(log.id)
    try {
      // Supprimer l'entrée de dédup pour pouvoir renvoyer
      await supabase.from('email_logs').delete().eq('id', log.id)
      await sendOrderEmail(log.order_id, log.email_type)
      await load()
    } catch (err) {
      alert(`Erreur : ${err.message}`)
    } finally {
      setResending(null)
    }
  }

  const filtered = filter === 'all' ? logs : logs.filter(l => l.email_type === filter)

  // Stats
  const sent   = logs.filter(l => l.status === 'sent').length
  const errors = logs.filter(l => l.status === 'error').length

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-1">Emails transactionnels</h1>
      <p className="text-gray-400 text-sm mb-6">
        {sent} envoyés · {errors > 0 && <span className="text-red-400">{errors} erreurs</span>}
      </p>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {Object.entries(TYPE_LABELS).map(([type, { label, emoji }]) => {
          const count = logs.filter(l => l.email_type === type && l.status === 'sent').length
          return (
            <button
              key={type}
              onClick={() => setFilter(filter === type ? 'all' : type)}
              className={[
                'bg-gray-900 border rounded-xl p-3 text-left transition-colors',
                filter === type ? 'border-violet-500 bg-violet-500/10' : 'border-gray-800 hover:border-gray-600',
              ].join(' ')}
            >
              <div className="text-lg mb-1">{emoji}</div>
              <div className="text-xl font-bold text-white">{count}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </button>
          )
        })}
      </div>

      {/* Tableau */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="text-center text-gray-500 py-12">Chargement…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  {['Date', 'Type', 'Client', 'Email', 'Statut', 'Actions'].map(h => (
                    <th key={h} className="text-left text-gray-400 font-medium px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-gray-500 py-12">
                      Aucun email envoyé pour l'instant
                    </td>
                  </tr>
                )}
                {filtered.map(log => {
                  const typeInfo = TYPE_LABELS[log.email_type] ?? { label: log.email_type, emoji: '📧' }
                  return (
                    <tr key={log.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                        {new Date(log.sent_at).toLocaleString('fr-FR', {
                          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm">{typeInfo.emoji} {typeInfo.label}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {log.orders?.customer_name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{log.recipient}</td>
                      <td className="px-4 py-3">
                        {log.status === 'sent' ? (
                          <span className="px-2 py-0.5 bg-green-900/40 text-green-400 rounded-full text-xs">Envoyé</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-red-900/40 text-red-400 rounded-full text-xs" title={log.error_message}>
                            Erreur
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => resend(log)}
                          disabled={resending === log.id}
                          className="px-2.5 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700 transition-colors disabled:opacity-50"
                        >
                          {resending === log.id ? '…' : '↺ Renvoyer'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
