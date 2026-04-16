import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { sendAdvisorMessage } from '../../lib/anthropicClient'
import { useConfiguratorStore } from '../../store/configuratorStore'

// Dimensions des présets taille
const SIZE_DIMS = { S: [40, 20], M: [60, 30], L: [80, 40], XL: [120, 60] }

// Extrait la configuration recommandée d'un message IA
function parseConfig(text) {
  const match = text.match(/CONFIG:(\{[^}]+\})/)
  if (!match) return null
  try { return JSON.parse(match[1]) } catch { return null }
}

// Retire la ligne CONFIG: du texte affiché
function cleanText(text) {
  return text.replace(/CONFIG:\{[^}]+\}/g, '').trim()
}

// Bulle de message
function Bubble({ msg }) {
  const isUser = msg.role === 'user'
  const text   = cleanText(msg.content)
  const config = !isUser ? parseConfig(msg.content) : null
  const { setSizePreset, setMaterial, setMotifId, setLedPreset } = useConfiguratorStore()

  const applyConfig = () => {
    if (!config) return
    const dims = SIZE_DIMS[config.sizePreset] ?? [60, 30]
    setSizePreset(config.sizePreset, dims[0], dims[1])
    setMaterial(config.material)
    setMotifId(config.motifId)
    setLedPreset(config.ledPreset)
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
        isUser
          ? 'bg-amber-400 text-black rounded-tr-sm'
          : 'bg-slate-700 text-slate-100 rounded-tl-sm'
      }`}>
        <p style={{ whiteSpace: 'pre-wrap' }}>{text}</p>

        {/* Bouton appliquer la config recommandée */}
        {config && (
          <button
            onClick={applyConfig}
            className="mt-2 w-full py-1.5 rounded-lg bg-amber-400/20 hover:bg-amber-400/30
                       text-amber-300 text-xs font-semibold transition-colors border border-amber-400/30"
          >
            ✦ Appliquer cette configuration
          </button>
        )}
      </div>
    </div>
  )
}

export default function AIAdvisor() {
  const [open, setOpen]       = useState(false)
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Bonjour ! 👋 Je suis votre conseiller LumiCut. Parlez-moi de votre pièce, de votre style déco, ou de l'occasion — je vais vous recommander le panneau idéal.",
    },
  ])
  const bottomRef = useRef(null)

  // Scroll automatique vers le bas
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const userMsg = { role: 'user', content: input.trim() }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)
    setError(null)

    try {
      // L'historique envoyé à l'API (sans le message d'accueil qui est local)
      const apiHistory = nextMessages
        .filter((_, i) => i > 0 || nextMessages[0].role === 'user') // exclude initial assistant bubble
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: cleanText(m.content) }))

      const reply = await sendAdvisorMessage(apiHistory)
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* Bouton flottant */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full
                   bg-amber-400 text-black font-semibold text-sm shadow-lg shadow-amber-400/20"
      >
        <span>{open ? '×' : '💬'}</span>
        {!open && 'Besoin d\'aide pour choisir ?'}
      </motion.button>

      {/* Panel latéral */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ x: 340, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 340, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-20 right-6 z-40 w-80 bg-slate-800 border border-slate-700
                       rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{ maxHeight: '70vh' }}
          >
            {/* En-tête */}
            <div className="px-4 py-3 bg-slate-700/50 border-b border-slate-700 flex items-center gap-2">
              <span className="text-amber-400">✦</span>
              <div>
                <div className="text-white text-sm font-semibold">Conseiller LumiCut</div>
                <div className="text-slate-400 text-xs">Powered by Claude</div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <Bubble key={i} msg={msg} />
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-slate-700 rounded-2xl rounded-tl-sm px-4 py-2.5">
                    <div className="flex gap-1">
                      {[0, 150, 300].map(delay => (
                        <span key={delay}
                          className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                          style={{ animationDelay: `${delay}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {error && (
                <div className="text-red-400 text-xs bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">
                  {error}
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Saisie */}
            <div className="p-3 border-t border-slate-700 flex gap-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Écrivez votre message…"
                rows={1}
                disabled={loading}
                className="flex-1 bg-slate-700 border border-slate-600 text-slate-100 text-sm rounded-xl
                           px-3 py-2 resize-none focus:outline-none focus:border-amber-400/60
                           transition-colors placeholder:text-slate-500"
                style={{ minHeight: '38px', maxHeight: '96px' }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="px-3 py-2 rounded-xl bg-amber-400 text-black font-bold text-sm
                           hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed
                           transition-colors flex-shrink-0"
              >
                →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
