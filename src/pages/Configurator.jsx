import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import ConfigPanel from '../components/ConfigPanel'
import Viewer3D from '../components/Viewer3D'
import Viewer2D from '../components/Viewer2D'
import ProjectSummary from '../components/ProjectSummary'
import { useProjectStore } from '../store/projectStore'

export default function Configurator() {
  const { template, params, viewMode, setViewMode, boardWidth, boardHeight } = useProjectStore()

  const pieces = useMemo(() => {
    try {
      return template.computePieces(params)
    } catch (e) {
      console.error('computePieces error:', e)
      return []
    }
  }, [template, params])

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900">
      {/* Left panel — config */}
      <div className="w-64 flex-shrink-0 bg-slate-800 border-r border-slate-700 overflow-y-auto p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Link to="/box/templates" className="text-slate-400 hover:text-sky-400 text-xs transition-colors">
            ← Templates
          </Link>
          <span className="text-xs text-slate-500">{template.emoji}</span>
        </div>
        <ConfigPanel />
      </div>

      {/* Center — viewer */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* View toggle */}
        <div className="flex gap-2 p-3 border-b border-slate-700 bg-slate-800">
          {[['3d','Vue 3D'],['2d','Vue 2D (découpe)']].map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${viewMode === mode ? 'bg-sky-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-hidden">
          {viewMode === '3d'
            ? <Viewer3D pieces={pieces} params={params} />
            : <Viewer2D pieces={pieces} boardWidth={boardWidth} boardHeight={boardHeight} />
          }
        </div>
      </div>

      {/* Right panel — summary */}
      <div className="w-56 flex-shrink-0 bg-slate-800 border-l border-slate-700 overflow-y-auto p-4">
        <ProjectSummary pieces={pieces} />
      </div>
    </div>
  )
}
