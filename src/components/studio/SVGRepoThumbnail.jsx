import { useState } from 'react'
import { useFavoritesStore } from '../../store/favoritesStore'

// Carte motif SVGRepo avec bouton favori
export default function SVGRepoThumbnail({ motif, onSelect, loading = false }) {
  const { isFavorite, addFavorite, removeFavorite } = useFavoritesStore()
  const [imgError, setImgError] = useState(false)
  const favorite = isFavorite(motif.id)

  const handleFavorite = (e) => {
    e.stopPropagation()
    if (favorite) removeFavorite(motif.id)
    else addFavorite(motif)
  }

  if (loading) {
    return (
      <div className="rounded-lg overflow-hidden border border-slate-700 bg-slate-700/50 animate-pulse aspect-square" />
    )
  }

  return (
    <button
      onClick={() => onSelect(motif)}
      className="relative group rounded-lg overflow-hidden border border-slate-700 hover:border-amber-400/60
                 transition-all bg-white aspect-square"
      title={motif.title || motif.slug}
    >
      {/* Thumbnail */}
      {!imgError && motif.thumbnailUrl ? (
        <img
          src={motif.thumbnailUrl}
          alt={motif.title || ''}
          className="w-full h-full object-contain p-1"
          onError={() => setImgError(true)}
        />
      ) : (
        // Fallback : afficher le SVG inline si disponible, sinon placeholder
        motif.svg ? (
          <div
            className="w-full h-full p-1"
            style={{ lineHeight: 0 }}
            dangerouslySetInnerHTML={{ __html: motif.svg }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">SVG</div>
        )
      )}

      {/* Overlay hover */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />

      {/* Bouton favori */}
      <button
        onClick={handleFavorite}
        className={`absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center
                    text-xs transition-all opacity-0 group-hover:opacity-100
                    ${favorite ? 'opacity-100 bg-red-500/90 text-white' : 'bg-black/50 text-white/70 hover:text-red-400'}`}
      >
        ♥
      </button>
    </button>
  )
}
