import { useState, useEffect } from 'react'

// Toolbar contextuelle affichée quand un objet est sélectionné sur le canvas
export default function ObjectToolbar({ object, canvas }) {
  const [x, setX]         = useState(0)
  const [y, setY]         = useState(0)
  const [angle, setAngle] = useState(0)

  useEffect(() => {
    if (!object) return
    setX(Math.round(object.left  ?? 0))
    setY(Math.round(object.top   ?? 0))
    setAngle(Math.round(object.angle ?? 0))

    const onModified = () => {
      setX(Math.round(object.left  ?? 0))
      setY(Math.round(object.top   ?? 0))
      setAngle(Math.round(object.angle ?? 0))
    }
    canvas.on('object:modified', onModified)
    canvas.on('object:moving',   onModified)
    canvas.on('object:rotating', onModified)
    return () => {
      canvas.off('object:modified', onModified)
      canvas.off('object:moving',   onModified)
      canvas.off('object:rotating', onModified)
    }
  }, [object, canvas])

  const apply = (field, value) => {
    if (!object) return
    object.set(field, Number(value))
    object.setCoords()
    canvas.requestRenderAll()
  }

  const handleDelete = () => {
    canvas.remove(object)
    canvas.discardActiveObject()
    canvas.requestRenderAll()
  }

  const handleFlipH = () => {
    object.set('flipX', !object.flipX)
    canvas.requestRenderAll()
  }

  const handleFlipV = () => {
    object.set('flipY', !object.flipY)
    canvas.requestRenderAll()
  }

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-800 border-b border-slate-700 text-xs text-slate-300 flex-wrap">
      {/* Position */}
      <label className="flex items-center gap-1">
        X
        <input
          type="number"
          value={x}
          onChange={e => { setX(e.target.value); apply('left', e.target.value) }}
          className="w-16 bg-slate-700 border border-slate-600 rounded px-1.5 py-0.5 text-white"
        />
      </label>
      <label className="flex items-center gap-1">
        Y
        <input
          type="number"
          value={y}
          onChange={e => { setY(e.target.value); apply('top', e.target.value) }}
          className="w-16 bg-slate-700 border border-slate-600 rounded px-1.5 py-0.5 text-white"
        />
      </label>

      <div className="w-px h-4 bg-slate-600" />

      {/* Rotation */}
      <label className="flex items-center gap-1">
        ↻
        <input
          type="number"
          value={angle}
          onChange={e => { setAngle(e.target.value); apply('angle', e.target.value) }}
          className="w-16 bg-slate-700 border border-slate-600 rounded px-1.5 py-0.5 text-white"
        />
        °
      </label>

      <div className="w-px h-4 bg-slate-600" />

      {/* Flip */}
      <button onClick={handleFlipH} className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 transition-colors" title="Miroir horizontal">⟺</button>
      <button onClick={handleFlipV} className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 transition-colors" title="Miroir vertical">⥮</button>

      <div className="w-px h-4 bg-slate-600" />

      {/* Supprimer */}
      <button
        onClick={handleDelete}
        className="px-2 py-0.5 rounded bg-red-900/40 hover:bg-red-800/60 text-red-400 hover:text-red-300 transition-colors"
      >
        Supprimer
      </button>
    </div>
  )
}
