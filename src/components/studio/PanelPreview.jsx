import { motion, AnimatePresence } from 'framer-motion'
import { useConfiguratorStore } from '../../store/configuratorStore'
import { motifs } from '../../motifs/index'

const MATERIAL_COLORS = {
  'acrylic-black':  { panel: '#0a0a0a', border: '#1a1a1a' },
  'acrylic-white':  { panel: '#f0f0f0', border: '#e0e0e0' },
  'acrylic-smoked': { panel: '#1a1a2e', border: '#16213e' },
  'birch-plywood':  { panel: '#c8a97a', border: '#b89060' },
  'mdf-black':      { panel: '#111111', border: '#222222' },
}

const AMBIANCE_DAY = {
  salon:   { bg: '#f5f0e8', walls: '#ece5d8', floor: '#d4c9b0' },
  chambre: { bg: '#eef0f5', walls: '#e5e8f0', floor: '#c8ccd8' },
  bureau:  { bg: '#f0f5f0', walls: '#e8f0e8', floor: '#ccd8cc' },
}

const AMBIANCE_NIGHT = {
  salon:   { bg: '#1a1208', walls: '#2d2010', floor: '#0d0904' },
  chambre: { bg: '#0d1220', walls: '#1a2040', floor: '#080e18' },
  bureau:  { bg: '#0a1a0a', walls: '#0f2a0f', floor: '#060e06' },
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3),16)
  const g = parseInt(hex.slice(3,5),16)
  const b = parseInt(hex.slice(5,7),16)
  return `rgba(${r},${g},${b},${alpha})`
}

function lighten(hex) {
  // Simple lightening — mix with white
  const r = Math.min(255, parseInt(hex.slice(1,3),16) + 60)
  const g = Math.min(255, parseInt(hex.slice(3,5),16) + 60)
  const b = Math.min(255, parseInt(hex.slice(5,7),16) + 60)
  return `rgb(${r},${g},${b})`
}

export default function PanelPreview() {
  const {
    motifId, material, ledColor, lightOn, ambiance, dayNight,
    width, height,
    motifScale, motifX, motifY, motifRotation, motifMirrorH, motifMirrorV,
    showText, textContent, textSecondary, textFont, textAlign, textLetterSpacing, textSize, textPosition,
  } = useConfiguratorStore()

  const isNight = dayNight === 'night'
  const ambianceMap = isNight ? AMBIANCE_NIGHT : AMBIANCE_DAY
  const ambianceConfig = ambianceMap[ambiance] || ambianceMap.salon

  const matColors = MATERIAL_COLORS[material] || MATERIAL_COLORS['acrylic-black']
  const motif = motifs.find(m => m.id === motifId) || motifs[0]

  const aspectRatio = (width || 60) / (height || 30)
  const previewW = 320
  const previewH = previewW / aspectRatio

  // Strip outer SVG tags and white background
  const svgContent = motif.svg
    .replace(/<\/?svg[^>]*>/g, '')
    .replace(/<rect[^>]*fill="white"[^>]*\/>/g, '')
    .replace(/<!--[^>]*-->/g, '')

  // Glow intensity: night = full, day = 20%
  const glowIntensity = isNight ? 1 : 0.2
  const glowAlpha = isNight ? 0.6 : 0.12
  const glowColor = hexToRgba(ledColor, glowAlpha)
  const lightColor = lighten(ledColor)

  // Build motif SVG transform
  const centerX = 100
  const centerY = 100
  const scaleVal = motifScale / 100
  const mirrorTransform = `scale(${motifMirrorH ? -1 : 1},${motifMirrorV ? -1 : 1})`
  const motifTransform = [
    `translate(${centerX + motifX}, ${centerY + motifY})`,
    `rotate(${motifRotation})`,
    mirrorTransform,
    `scale(${scaleVal})`,
    `translate(-100,-100)`,
  ].join(' ')

  // Text Y position
  const textY = textPosition === 'top' ? 15 : textPosition === 'center' ? 100 : 180
  const mainFontSize = (textSize / 100) * 30
  const subFontSize = mainFontSize * 0.55

  const replaceColors = (svg, fill, stroke) =>
    svg.replace(/fill="black"/g, `fill="${fill}"`).replace(/stroke="black"/g, `stroke="${stroke}"`)

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden transition-all duration-700"
      style={{
        background: isNight
          ? `radial-gradient(ellipse at center bottom, ${ambianceConfig.walls} 0%, ${ambianceConfig.bg} 70%)`
          : `linear-gradient(to bottom, ${ambianceConfig.walls} 0%, ${ambianceConfig.bg} 100%)`,
      }}
    >
      {/* Day mode ambient light */}
      {!isNight && (
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.15) 0%, transparent 50%)' }} />
      )}

      {/* Floor */}
      <div className="absolute bottom-0 left-0 right-0 h-1/3 pointer-events-none"
        style={{ background: `linear-gradient(to top, ${ambianceConfig.floor}, transparent)` }} />

      {/* Ambient wall glow (night only, or very subtle day) */}
      <AnimatePresence>
        {lightOn && (
          <motion.div
            key="wall-glow"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: glowIntensity, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.6 }}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: previewW + 200,
              height: previewH + 200,
              background: `radial-gradient(ellipse, ${glowColor} 0%, transparent 65%)`,
              filter: `blur(${isNight ? 30 : 10}px)`,
            }}
          />
        )}
      </AnimatePresence>

      {/* Panel */}
      <motion.div
        className="relative z-10 rounded-sm overflow-hidden"
        animate={{
          boxShadow: lightOn && isNight
            ? `0 0 40px 12px ${glowColor}, 0 0 90px 30px ${hexToRgba(ledColor, 0.2)}, inset 0 0 30px rgba(0,0,0,0.6), 0 20px 60px rgba(0,0,0,0.8)`
            : lightOn && !isNight
            ? `0 4px 20px ${hexToRgba(ledColor, 0.1)}, 0 10px 40px rgba(0,0,0,0.2)`
            : '0 20px 60px rgba(0,0,0,0.7)',
        }}
        transition={{ duration: 0.5 }}
        style={{
          width: previewW,
          height: previewH,
          background: matColors.panel,
          border: `2px solid ${matColors.border}`,
        }}
      >
        <svg
          viewBox="0 0 200 200"
          width="100%"
          height="100%"
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          <defs>
            {lightOn && (
              <>
                <filter id="glow1" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur"/>
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
                <filter id="glow2" x="-80%" y="-80%" width="260%" height="260%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur"/>
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
                <filter id="glow3" x="-120%" y="-120%" width="340%" height="340%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="18" result="blur"/>
                  <feMerge><feMergeNode in="blur"/></feMerge>
                </filter>
              </>
            )}
          </defs>

          {/* Motif group with transforms */}
          <g transform={motifTransform}>
            {lightOn ? (
              <>
                <g dangerouslySetInnerHTML={{ __html: replaceColors(svgContent, ledColor, ledColor) }}
                  style={{ filter: 'url(#glow3)', opacity: 0.3 * glowIntensity }} />
                <g dangerouslySetInnerHTML={{ __html: replaceColors(svgContent, ledColor, ledColor) }}
                  style={{ filter: 'url(#glow2)', opacity: 0.5 * glowIntensity }} />
                <g dangerouslySetInnerHTML={{ __html: replaceColors(svgContent, lightColor, lightColor) }}
                  style={{ filter: 'url(#glow1)', opacity: 0.85 }} />
                <g dangerouslySetInnerHTML={{ __html: replaceColors(svgContent, 'white', 'white') }}
                  style={{ opacity: 0.95 }} />
              </>
            ) : (
              <g dangerouslySetInnerHTML={{ __html: replaceColors(svgContent, 'rgba(255,255,255,0.07)', 'rgba(255,255,255,0.07)') }} />
            )}
          </g>

          {/* Text overlay */}
          {showText && textContent && (
            <text
              x={textAlign === 'left' ? 10 : textAlign === 'right' ? 190 : 100}
              y={textY}
              textAnchor={textAlign === 'left' ? 'start' : textAlign === 'right' ? 'end' : 'middle'}
              dominantBaseline="middle"
              fontFamily={textFont}
              fontSize={mainFontSize}
              letterSpacing={textLetterSpacing}
              fill={lightOn ? 'white' : 'rgba(255,255,255,0.08)'}
              style={{ filter: lightOn ? 'url(#glow1)' : 'none' }}
            >
              {textContent}
            </text>
          )}
          {showText && textSecondary && (
            <text
              x={textAlign === 'left' ? 10 : textAlign === 'right' ? 190 : 100}
              y={textY + mainFontSize * 1.2}
              textAnchor={textAlign === 'left' ? 'start' : textAlign === 'right' ? 'end' : 'middle'}
              dominantBaseline="middle"
              fontFamily={textFont}
              fontSize={subFontSize}
              letterSpacing={textLetterSpacing * 0.5}
              fill={lightOn ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.05)'}
            >
              {textSecondary}
            </text>
          )}
        </svg>

        {/* Inner radial glow overlay */}
        <AnimatePresence>
          {lightOn && (
            <motion.div
              key="inner-glow"
              initial={{ opacity: 0 }}
              animate={{ opacity: glowIntensity * 0.6 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(ellipse at center, ${hexToRgba(ledColor, 0.18)} 0%, transparent 65%)`,
                mixBlendMode: 'screen',
              }}
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* Wall streak (night only) */}
      <AnimatePresence>
        {lightOn && isNight && (
          <motion.div
            key="wall-streak"
            initial={{ opacity: 0, scaleX: 0.5 }}
            animate={{ opacity: 0.5, scaleX: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute pointer-events-none"
            style={{
              width: previewW + 160,
              height: 8,
              background: `radial-gradient(ellipse at center, ${ledColor} 0%, transparent 70%)`,
              top: `calc(50% + ${previewH / 2}px + 4px)`,
              filter: 'blur(4px)',
              borderRadius: '50%',
            }}
          />
        )}
      </AnimatePresence>

      {/* Day mode caption */}
      {!isNight && (
        <div className="absolute bottom-12 text-xs text-slate-500 italic">
          Effet discret en journée
        </div>
      )}
      {isNight && lightOn && (
        <div className="absolute bottom-12 text-xs text-slate-600 italic">
          Effet spectaculaire le soir
        </div>
      )}

      <div className="relative z-10 mt-6 text-xs text-slate-500 font-mono tracking-widest">
        {width} × {height} cm
      </div>
    </div>
  )
}
