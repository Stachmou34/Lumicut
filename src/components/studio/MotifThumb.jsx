import { memo } from 'react'
import { glowingThumbnailSvg } from '../../motifs/catalog'

// Vignette lumineuse d'un motif : découpes dorées sur panneau sombre, comme le produit allumé
function MotifThumb({ svg, className = 'aspect-[2/1]' }) {
  return (
    <div
      className={`w-full bg-slate-950 text-amber-300 p-1.5 [&>svg]:w-full [&>svg]:h-full ${className}`}
      dangerouslySetInnerHTML={{ __html: glowingThumbnailSvg(svg) }}
    />
  )
}

export default memo(MotifThumb)
