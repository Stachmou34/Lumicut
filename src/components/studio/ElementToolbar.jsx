import { useConfiguratorStore } from '../../store/configuratorStore'
import { scaleBy, rotateBy } from '../../lib/panelEditing'
import { randomSeed } from '../../lib/generators'

function ToolButton({ title, onClick, active = false, disabled = false, children }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={`min-w-7 h-7 px-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-30 focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-400 ${active ? 'bg-amber-400 text-black' : 'hover:bg-slate-700 text-slate-200'}`}
    >
      {children}
    </button>
  )
}

function Separator() {
  return <span className="w-px h-5 bg-slate-600 mx-0.5" />
}

// Barre d'outils flottante au-dessus de l'élément sélectionné (2D et 3D)
export default function ElementToolbar({ element }) {
  const s = useConfiguratorStore()
  if (!element) return null

  // Chaque action est annulable
  const apply = patch => {
    s.pushEditHistory()
    s.setMotifTransform(patch)
  }

  return (
    <div
      className="flex flex-col gap-1 bg-slate-900/95 border border-slate-600 rounded-xl p-1 shadow-2xl shadow-black/60 text-slate-200 backdrop-blur"
      onPointerDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
      onDoubleClick={e => e.stopPropagation()}
    >
      <div className="flex items-center gap-0.5 whitespace-nowrap">
        {element === 'motif' && (
          <>
            <ToolButton title="Réduire (−)" onClick={() => apply(scaleBy('motif', s, -5))}>−</ToolButton>
            <span className="text-[10px] text-slate-400 font-mono w-9 text-center">{Math.round(s.motifScale)}%</span>
            <ToolButton title="Agrandir (+)" onClick={() => apply(scaleBy('motif', s, 5))}>+</ToolButton>
            <Separator />
            <ToolButton title="Tourner à gauche (Maj+R)" onClick={() => apply(rotateBy('motif', s, -15))}>⟲</ToolButton>
            <ToolButton title="Tourner à droite (R)" onClick={() => apply(rotateBy('motif', s, 15))}>⟳</ToolButton>
            <ToolButton title="Miroir horizontal" active={s.motifMirrorH} onClick={() => apply({ motifMirrorH: !s.motifMirrorH })}>⇋</ToolButton>
            <ToolButton title="Miroir vertical" active={s.motifMirrorV} onClick={() => apply({ motifMirrorV: !s.motifMirrorV })}>⇵</ToolButton>
            <ToolButton title="Recentrer" onClick={() => apply({ motifX: 0, motifY: 0, motifRotation: 0 })}>⊙</ToolButton>
          </>
        )}

        {element === 'text' && (
          <>
            <ToolButton title="Texte plus petit (−)" onClick={() => apply(scaleBy('text', s, -5))}>A−</ToolButton>
            <ToolButton title="Texte plus grand (+)" onClick={() => apply(scaleBy('text', s, 5))}>A+</ToolButton>
            <Separator />
            <ToolButton title="Tourner à gauche (Maj+R)" onClick={() => apply(rotateBy('text', s, -15))}>⟲</ToolButton>
            <ToolButton title="Tourner à droite (R)" onClick={() => apply(rotateBy('text', s, 15))}>⟳</ToolButton>
            <Separator />
            <ToolButton title="Aligner à gauche" active={s.textAlign === 'left'} onClick={() => { s.pushEditHistory(); s.setTextAlign('left') }}>⇤</ToolButton>
            <ToolButton title="Centrer" active={s.textAlign === 'center' && s.textX === null} onClick={() => { s.pushEditHistory(); s.setTextAlign('center') }}>↔</ToolButton>
            <ToolButton title="Aligner à droite" active={s.textAlign === 'right'} onClick={() => { s.pushEditHistory(); s.setTextAlign('right') }}>⇥</ToolButton>
            <Separator />
            <ToolButton title="Modifier le texte (double-clic)" active={s.inlineTextEdit} onClick={() => s.setInlineTextEdit(!s.inlineTextEdit)}>✎</ToolButton>
            <ToolButton
              title="Retirer le texte (Suppr)"
              onClick={() => { apply({ showText: false }); s.setSelectedElement(null) }}
            >
              🗑
            </ToolButton>
          </>
        )}

        {element === 'pattern' && (
          <>
            <span className="px-2 text-[11px] text-slate-400">Motif pleine surface</span>
            <ToolButton title="Autre variante" onClick={() => s.setGeneratorSeed(randomSeed())}>🎲</ToolButton>
            <ToolButton title="Miroir horizontal" active={s.motifMirrorH} onClick={() => apply({ motifMirrorH: !s.motifMirrorH })}>⇋</ToolButton>
            <ToolButton title="Miroir vertical" active={s.motifMirrorV} onClick={() => apply({ motifMirrorV: !s.motifMirrorV })}>⇵</ToolButton>
          </>
        )}

        <Separator />
        <ToolButton title="Annuler (Ctrl+Z)" disabled={!s.editHistory.length} onClick={s.undoEdit}>↶</ToolButton>
        <ToolButton title="Rétablir (Ctrl+Y)" disabled={!s.editFuture.length} onClick={s.redoEdit}>↷</ToolButton>
        <ToolButton title="Désélectionner (Échap)" onClick={() => s.setSelectedElement(null)}>✕</ToolButton>
      </div>

      {element === 'text' && s.inlineTextEdit && (
        <input
          autoFocus
          value={s.textContent}
          maxLength={30}
          placeholder="Votre texte…"
          onChange={e => s.setTextContent(e.target.value)}
          onKeyDown={e => {
            e.stopPropagation()
            if (e.key === 'Enter' || e.key === 'Escape') s.setInlineTextEdit(false)
          }}
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-amber-400"
        />
      )}
    </div>
  )
}
