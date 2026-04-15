import { useMemo } from 'react'
import { nestPieces } from '../lib/nesting'
import { estimateCost } from '../lib/estimateCost'
import { generateDXF } from '../lib/generateDXF'
import { generateSVG } from '../lib/generateSVG'
import { useProjectStore } from '../store/projectStore'
import { useNavigate } from 'react-router-dom'

export default function ProjectSummary({ pieces }) {
  const { params, template, boardWidth, boardHeight } = useProjectStore()
  const navigate = useNavigate()

  const { laid, overflow, totalHeight } = useMemo(
    () => nestPieces(pieces, boardWidth, boardHeight),
    [pieces, boardWidth, boardHeight]
  )

  const boardsNeeded = Math.ceil(totalHeight / boardHeight) || 1

  const cost = useMemo(
    () => estimateCost(pieces, params.material || 'plywood_3'),
    [pieces, params.material]
  )

  const handleDXF = () => {
    const content = generateDXF(pieces, boardWidth, boardHeight)
    download(content, `${template.id}_${params.width}x${params.depth}x${params.height || 0}mm.dxf`, 'application/dxf')
  }

  const handleSVG = () => {
    const content = generateSVG(pieces, boardWidth, boardHeight)
    download(content, `${template.id}_${params.width}x${params.depth}x${params.height || 0}mm.svg`, 'image/svg+xml')
  }

  const handleSave = () => {
    const data = { templateId: template.id, params }
    localStorage.setItem('laser_project', JSON.stringify(data))
    alert('Projet sauvegardé !')
  }

  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Résumé</div>

      <div className="bg-slate-700/50 rounded-lg p-3 flex flex-col gap-2 text-xs">
        <Row label="Pièces" value={pieces.length} />
        <Row label="Surface totale" value={`${cost.areaCm2} cm²`} />
        <Row label="Planches nécessaires" value={boardsNeeded} accent={overflow} />
      </div>

      <div className="bg-slate-700/50 rounded-lg p-3 flex flex-col gap-2">
        <div className="text-xs font-semibold text-slate-400">Estimation indicative</div>
        <div className="text-xl font-bold text-emerald-400">{cost.cost.toFixed(2)} €</div>
        <div className="text-xs text-slate-500">{cost.material}</div>
        <div className="text-xs text-slate-500 italic">
          Estimation indicative. Contactez votre atelier pour un devis exact.
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <button onClick={handleDXF}
          className="w-full py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm transition-colors">
          ⬇ Télécharger DXF
        </button>
        <button onClick={handleSVG}
          className="w-full py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-colors">
          ⬇ Télécharger SVG
        </button>
        <button onClick={handleSave}
          className="w-full py-2.5 rounded-lg bg-slate-600 hover:bg-slate-500 text-white font-semibold text-sm transition-colors">
          💾 Sauvegarder
        </button>
        <button onClick={() => navigate('/box/order')}
          className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors">
          🛒 Commander
        </button>
      </div>
    </div>
  )
}

function Row({ label, value, accent }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-400">{label}</span>
      <span className={accent ? 'text-amber-400 font-semibold' : 'text-slate-200'}>{value}</span>
    </div>
  )
}

function download(content, filename, mime) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
