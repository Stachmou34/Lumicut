// Toolbar principale du canvas — boutons permanents
export default function CanvasToolbar({ onAddText, onUndo, onRedo, canUndo, canRedo, lightOn, onToggleLight }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 border-b border-slate-700 flex-shrink-0">
      {/* Ajouter texte */}
      <button
        onClick={onAddText}
        className="px-3 py-1.5 rounded text-xs font-medium bg-slate-700 hover:bg-slate-600
                   text-slate-200 transition-colors flex items-center gap-1.5"
      >
        ✍️ + Texte
      </button>

      <div className="w-px h-4 bg-slate-600" />

      {/* Undo / Redo */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="px-2.5 py-1.5 rounded text-xs bg-slate-700 hover:bg-slate-600 text-slate-300
                   disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="Annuler (Ctrl+Z)"
      >
        ↩
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className="px-2.5 py-1.5 rounded text-xs bg-slate-700 hover:bg-slate-600 text-slate-300
                   disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="Refaire (Ctrl+Y)"
      >
        ↪
      </button>

      <div className="w-px h-4 bg-slate-600" />

      {/* Lumière */}
      <button
        onClick={onToggleLight}
        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
          lightOn
            ? 'bg-amber-400/20 text-amber-400 hover:bg-amber-400/30'
            : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
        }`}
      >
        💡 {lightOn ? 'Allumé' : 'Éteint'}
      </button>

      {/* Indication de zoom — slot réservé, rempli par PanelEditor */}
      <div className="ml-auto text-xs text-slate-500" id="zoom-indicator" />
    </div>
  )
}
