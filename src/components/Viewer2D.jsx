import { useMemo } from 'react'
import { nestPieces } from '../lib/nesting'

export default function Viewer2D({ pieces, boardWidth = 600, boardHeight = 400 }) {
  const SPACING = 8
  const PAD = 20

  const { laid, overflow } = useMemo(
    () => nestPieces(pieces, boardWidth, boardHeight, SPACING),
    [pieces, boardWidth, boardHeight]
  )

  if (!laid.length) return (
    <div className="w-full h-full flex items-center justify-center text-slate-500">
      Aucune pièce
    </div>
  )

  return (
    <div className="w-full h-full overflow-auto bg-slate-900 p-4 flex flex-col gap-2">
      {overflow && (
        <div className="bg-amber-900/50 border border-amber-600 text-amber-300 text-xs rounded px-3 py-2">
          ⚠ Pièces trop grandes pour une planche standard ({boardWidth}×{boardHeight}mm)
        </div>
      )}
      <svg
        viewBox={`${-PAD} ${-PAD} ${boardWidth + PAD * 2} ${boardHeight + PAD * 2}`}
        style={{ width: '100%', height: 'auto', minHeight: '300px' }}
      >
        <defs>
          <pattern id="grid2" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#1e293b" strokeWidth="0.5" />
          </pattern>
        </defs>

        {/* Board background */}
        <rect x={-PAD} y={-PAD} width={boardWidth + PAD*2} height={boardHeight + PAD*2} fill="url(#grid2)" />
        <rect x={0} y={0} width={boardWidth} height={boardHeight}
          fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="8,4" />

        {laid.map(p => {
          const pts = p.polygon.map(([x,y]) =>
            `${(x + p.offsetX).toFixed(2)},${(y + p.offsetY).toFixed(2)}`
          ).join(' ')

          const cx = p.polygon.reduce((s,[x])=>s+x,0)/p.polygon.length + p.offsetX
          const cy = p.polygon.reduce((s,[,y])=>s+y,0)/p.polygon.length + p.offsetY

          // Bounding box for dimension lines
          const xs = p.polygon.map(([x])=>x+p.offsetX)
          const ys = p.polygon.map(([,y])=>y+p.offsetY)
          const bMinX = Math.min(...xs), bMaxX = Math.max(...xs)
          const bMinY = Math.min(...ys), bMaxY = Math.max(...ys)
          const bW = (bMaxX - bMinX).toFixed(1)
          const bH = (bMaxY - bMinY).toFixed(1)

          return (
            <g key={p.id}>
              <polygon
                points={pts}
                fill={p.color + '22'}
                stroke={p.color}
                strokeWidth="0.8"
              />
              {/* Holes */}
              {(p.holes || []).map((hole, hi) => {
                const hpts = hole.map(([x,y])=>
                  `${(x+p.offsetX).toFixed(2)},${(y+p.offsetY).toFixed(2)}`
                ).join(' ')
                return <polygon key={hi} points={hpts} fill="#0f172a" stroke={p.color} strokeWidth="0.5" strokeDasharray="3,2" />
              })}
              {/* Label */}
              <text x={cx.toFixed(1)} y={cy.toFixed(1)}
                textAnchor="middle" dominantBaseline="middle"
                fontSize="5" fill={p.color} style={{userSelect:'none'}}>
                {p.label}
              </text>
              {/* Width dimension */}
              <text x={((bMinX+bMaxX)/2).toFixed(1)} y={(bMaxY+6).toFixed(1)}
                textAnchor="middle" fontSize="4" fill="#94a3b8">
                {bW}mm
              </text>
              {/* Height dimension */}
              <text x={(bMaxX+6).toFixed(1)} y={((bMinY+bMaxY)/2).toFixed(1)}
                textAnchor="start" dominantBaseline="middle" fontSize="4" fill="#94a3b8"
                transform={`rotate(-90,${(bMaxX+8).toFixed(1)},${((bMinY+bMaxY)/2).toFixed(1)})`}>
                {bH}mm
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
