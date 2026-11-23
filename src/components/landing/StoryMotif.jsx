import { useId } from 'react'
import { useLibraryShapes } from '../../lib/library/useLibraryShapes'

// Motif de la bibliothèque dessiné « en lumière » : silhouette pleine, contour (avec ses ponts),
// lignes ou points découpés dans la forme. Aperçu décoratif : le calcul exact se fait dans le studio.
export default function StoryMotif({ motif, style = 'silhouette', color = '#ffa757', gradient = null, glow = true, className = '' }) {
  const shapes = useLibraryShapes(motif)
  const uid = useId().replace(/:/g, '')
  if (!shapes) return null

  const paint = gradient ? `url(#grad-${uid})` : color
  const glowColor = gradient ? gradient[1] : color
  // Halo du motif : la lumière déborde un peu des découpes (couleur calculée : style en ligne autorisé)
  const glowStyle = glow ? { filter: `drop-shadow(0 0 2px ${glowColor}) drop-shadow(0 0 10px ${glowColor}aa)` } : undefined
  const clip = `url(#clip-${uid})`

  return (
    <svg viewBox="-30 -30 260 260" className={className} style={glowStyle} aria-hidden="true">
      <defs>
        <clipPath id={`clip-${uid}`}>
          {shapes.paths.map((p, i) => <path key={i} d={p.d} clipRule={p.rule} />)}
        </clipPath>
        {gradient && (
          <linearGradient id={`grad-${uid}`} x1="0" y1="0" x2="1" y2="1">
            {gradient.map((c, i) => <stop key={c + i} offset={i / (gradient.length - 1)} stopColor={c} />)}
          </linearGradient>
        )}
        <pattern id={`dots-${uid}`} width="7" height="7" patternUnits="userSpaceOnUse">
          <circle cx="3.5" cy="3.5" r="1.7" fill={paint} />
        </pattern>
      </defs>

      {style === 'silhouette' && shapes.paths.map((p, i) => (
        <path key={i} d={p.d} fillRule={p.rule} fill={paint} />
      ))}

      {style === 'contour' && shapes.paths.map((p, i) => (
        <path key={i} d={p.d} fill="none" stroke={paint} strokeWidth="2.4" strokeDasharray="16 3" strokeLinejoin="round" />
      ))}

      {style === 'lines' && (
        <g clipPath={clip}>
          {Array.from({ length: 29 }, (_, i) => (
            <rect key={i} x="0" y={i * 7 + 1} width="200" height="2.6" fill={paint} />
          ))}
        </g>
      )}

      {style === 'dots' && (
        <g clipPath={clip}>
          <rect x="0" y="0" width="200" height="200" fill={`url(#dots-${uid})`} />
        </g>
      )}
    </svg>
  )
}
