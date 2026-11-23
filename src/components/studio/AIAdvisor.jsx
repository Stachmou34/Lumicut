import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { sendAdvisorMessage } from '../../lib/anthropicClient'
import { useConfiguratorStore } from '../../store/configuratorStore'
import { LIGHT_MODELS } from '../../lib/lighting/lightingCatalog'
import { getSizePreset } from '../../lib/sizes'

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
  const { setSizePreset, setMaterial, setMotifId, setLedPreset, setLightModel } = useConfiguratorStore()

  const applyConfig = () => {
    if (!config) return
    const size = getSizePreset(config.sizePreset) ?? getSizePreset('M')
    setSizePreset(size.id, size.width, size.height)
    setMaterial(config.material)
    setMotifId(config.motifId)
    // Modèle d'éclairage seulement s'il existe ; une couleur bascule d'elle-même sur un ruban Hue
    if (LIGHT_MODELS.some(m => m.id === config.lightModel)) setLightModel(config.lightModel)
    if (config.ledPreset) setLedPreset(config.ledPreset)
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

// Conseiller IA : s'ouvre depuis le lien « Besoin d'aide pour choisir ? » du panneau d'étape.
// Ordinateur : au-dessus du panneau de droite, sans cacher le bouton d'étape ; mobile : feuille en bas d'écran.
export default function AIAdvisor({ open, onClose }) {
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
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-label="Conseiller LumiCut"
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="fixed z-40 inset-x-2 bottom-2 max-h-[75dvh] lg:inset-x-auto lg:right-4 lg:bottom-24 lg:w-96 lg:max-h-[70vh]
                     bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* En-tête */}
          <div className="px-4 py-3 bg-slate-700/50 border-b border-slate-700 flex items-center gap-2">
            <span className="text-amber-400">✦</span>
            <div className="flex-1">
              <div className="text-white text-sm font-semibold">Conseiller LumiCut</div>
              <div className="text-slate-400 text-xs">Powered by Claude</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer le conseiller"
              className="w-8 h-8 rounded-full text-slate-400 hover:text-white hover:bg-slate-600/60 text-lg leading-none"
            >
              ×
            </button>
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
              className="flex-1 bg-slate-700 border border-slate-600 text-slate-100 text-base lg:text-sm rounded-xl
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
  )
}
