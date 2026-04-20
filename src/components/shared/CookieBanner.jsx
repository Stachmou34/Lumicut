import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'

const STORAGE_KEY = 'lumicut_cookie_consent'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Afficher le bandeau uniquement si pas encore de choix
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) setVisible(true)
  }, [])

  function accept() {
    localStorage.setItem(STORAGE_KEY, 'accepted')
    setVisible(false)
  }

  function decline() {
    localStorage.setItem(STORAGE_KEY, 'declined')
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50"
        >
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 shadow-2xl shadow-black/50">
            <p className="text-sm text-slate-300 mb-4 leading-relaxed">
              🍪 Nous utilisons des cookies essentiels et, avec votre accord, des cookies
              analytiques pour améliorer votre expérience.{' '}
              <Link
                to="/politique-confidentialite"
                className="text-amber-400 hover:text-amber-300 underline"
              >
                En savoir plus
              </Link>
            </p>
            <div className="flex gap-2">
              <button
                onClick={accept}
                className="flex-1 py-2 bg-amber-400 hover:bg-amber-300 text-black text-sm font-bold rounded-xl transition-colors"
              >
                Accepter
              </button>
              <button
                onClick={decline}
                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium rounded-xl transition-colors"
              >
                Refuser
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
