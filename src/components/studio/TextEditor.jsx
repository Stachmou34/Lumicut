import { useConfiguratorStore } from '../../store/configuratorStore'
import { motion } from 'framer-motion'

export const FONTS = [
  { id: 'Inter',           label: 'Moderne Sans',     style: 'font-sans',       google: 'Inter:wght@400;700' },
  { id: 'Playfair Display',label: 'Serif Élégant',    style: 'font-serif',      google: 'Playfair+Display:wght@400;700' },
  { id: 'Dancing Script',  label: 'Script Manuscrit', style: 'italic',          google: 'Dancing+Script:wght@400;700' },
  { id: 'Bebas Neue',      label: 'Bold Impact',      style: 'tracking-widest', google: 'Bebas+Neue' },
  { id: 'Oswald',          label: 'Stencil',          style: 'uppercase',       google: 'Oswald:wght@400;700' },
  { id: 'Nunito',          label: 'Rounded',          style: '',                google: 'Nunito:wght@400;700' },
  { id: 'UnifrakturMaguntia', label: 'Gothic',        style: '',                google: 'UnifrakturMaguntia' },
  { id: 'Raleway',         label: 'Minimal Thin',     style: 'font-light',      google: 'Raleway:wght@300;400' },
]

// Load Google Fonts dynamically
function loadFont(googleId) {
  const linkId = `gfont-${googleId.replace(/[^a-z]/gi,'')}`
  if (document.getElementById(linkId)) return
  const link = document.createElement('link')
  link.id = linkId
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${googleId}&display=swap`
  document.head.appendChild(link)
}

function Slider({ label, value, min, max, step, unit, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="text-amber-400 font-mono">{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  )
}

export default function TextEditor() {
  const {
    showText, setShowText,
    textContent, setTextContent,
    textSecondary, setTextSecondary,
    textFont, setTextFont,
    textAlign, setTextAlign,
    textLetterSpacing, setTextLetterSpacing,
    textSize, setTextSize,
    textPosition, setTextPosition,
    material,
  } = useConfiguratorStore()

  const thickness = material.includes('3') ? 3 : 6
  const minFontSize = thickness === 3 ? 18 : 14
  const approxFontPx = (textSize / 100) * 200 * 0.15
  const fontTooSmall = textContent && approxFontPx < minFontSize

  return (
    <div className="flex flex-col gap-4">
      {/* Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Texte personnalisé</span>
        <button
          onClick={() => setShowText(!showText)}
          className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${showText ? 'bg-amber-500' : 'bg-slate-600'}`}
        >
          <motion.div
            layout
            className="w-4 h-4 rounded-full bg-white shadow"
            animate={{ x: showText ? 20 : 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </button>
      </div>

      {showText && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="flex flex-col gap-4 overflow-hidden"
        >
          {/* Main text */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Texte principal <span className="text-slate-600">(max 30 car.)</span></label>
            <input
              type="text"
              maxLength={30}
              value={textContent}
              onChange={e => setTextContent(e.target.value)}
              placeholder="Votre prénom, citation..."
              className="w-full bg-slate-700 text-slate-200 text-sm rounded px-3 py-2 border border-slate-600 focus:outline-none focus:border-amber-400"
              style={{ fontFamily: textFont }}
            />
          </div>

          {/* Secondary text */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Sous-titre <span className="text-slate-600">(optionnel, max 40 car.)</span></label>
            <input
              type="text"
              maxLength={40}
              value={textSecondary}
              onChange={e => setTextSecondary(e.target.value)}
              placeholder="Date, citation courte..."
              className="w-full bg-slate-700 text-slate-200 text-xs rounded px-3 py-2 border border-slate-600 focus:outline-none focus:border-amber-400"
              style={{ fontFamily: textFont }}
            />
          </div>

          {/* Font selection */}
          <div className="flex flex-col gap-2">
            <span className="text-xs text-slate-400">Police</span>
            <div className="grid grid-cols-2 gap-1.5">
              {FONTS.map(f => {
                loadFont(f.google)
                return (
                  <button
                    key={f.id}
                    onClick={() => setTextFont(f.id)}
                    className={`p-2 rounded-lg border transition-all text-left ${textFont === f.id ? 'border-amber-400 bg-amber-400/5' : 'border-slate-700 hover:border-slate-500 bg-slate-800'}`}
                    style={{ fontFamily: f.id }}
                  >
                    <div className="text-xs text-slate-400 leading-none mb-0.5">{f.label}</div>
                    <div className="text-sm text-slate-200 truncate" style={{ fontFamily: f.id }}>
                      {textContent || 'Exemple'}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Position */}
          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Position</span>
            <div className="flex gap-1">
              {[['top','Haut'],['center','Centre'],['bottom','Bas']].map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setTextPosition(v)}
                  className={`flex-1 py-1.5 text-xs rounded transition-colors ${textPosition === v ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Alignment */}
          <div className="flex gap-1">
            {[['left','←'],['center','↔'],['right','→']].map(([v, icon]) => (
              <button
                key={v}
                onClick={() => setTextAlign(v)}
                className={`flex-1 py-1.5 text-sm rounded transition-colors ${textAlign === v ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
              >
                {icon}
              </button>
            ))}
          </div>

          {/* Sliders */}
          <Slider label="Taille" value={textSize} min={40} max={95} step={1} unit="%" onChange={setTextSize} />
          <Slider label="Espacement" value={textLetterSpacing} min={-2} max={10} step={0.5} unit="px" onChange={setTextLetterSpacing} />

          {/* Validation warning */}
          {fontTooSmall && (
            <div className="bg-amber-900/30 border border-amber-700/40 text-amber-300 text-xs rounded-lg px-3 py-2">
              ⚠️ Certaines lettres risquent d'être fragiles à la découpe. Augmentez la taille ou choisissez une police plus épaisse.
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
