import { useRef, useState } from 'react'
import { useElementEditing } from '../../lib/useElementEditing'
import { boxHandles } from '../../lib/panelEditing'
import ElementToolbar from './ElementToolbar'

const MARGIN_PX = 56 // marge autour du panneau pour les poignées et la barre d'outils
const HANDLE_PX = 6

function outlinePoints(box) {
  return boxHandles(box, 0).corners.map(c => c.join(',')).join(' ')
}

// Cadre de sélection : contour, coins (agrandir) et poignée de rotation
function Selection({ box, handleR }) {
  const h = boxHandles(box, handleR * 4)
  return (
    <g pointerEvents="none">
      <polygon points={outlinePoints(box)} fill="none" stroke="#fbbf24" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      {box.kind !== 'pattern' && (
        <>
          <line
            x1={h.topCenter[0]} y1={h.topCenter[1]} x2={h.rotate[0]} y2={h.rotate[1]}
            stroke="#fbbf24" strokeWidth="1.5" vectorEffect="non-scaling-stroke"
          />
          <circle cx={h.rotate[0]} cy={h.rotate[1]} r={handleR} fill="#fbbf24" stroke="#0f172a" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          {h.corners.map(([x, y], i) => (
            <rect
              key={i}
              x={x - handleR} y={y - handleR} width={handleR * 2} height={handleR * 2} rx={handleR * 0.3}
              fill="white" stroke="#f59e0b" strokeWidth="1.5" vectorEffect="non-scaling-stroke"
            />
          ))}
        </>
      )}
    </g>
  )
}

// Calque d'édition directe posé sur l'aperçu 2D (repère 200, étendu d'une marge)
export default function EditorOverlay2D({ design, previewW, previewH, vb }) {
  const svgRef = useRef(null)
  const [cursor, setCursor] = useState('')
  const edit = useElementEditing(design)
  const pxPerUnit = previewW / vb.w
  const mU = MARGIN_PX / pxPerUnit
  const handleR = HANDLE_PX / pxPerUnit
  const viewX = vb.x - mU
  const viewY = vb.y - mU

  // Pointeur (pixels écran) → point du repère 200
  const toSquare = e => {
    const svg = svgRef.current
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const p = pt.matrixTransform(svg.getScreenCTM().inverse())
    return [p.x, p.y]
  }

  const selectedBox = edit.selected && edit.boxes[edit.selected]
  const hoverBox = edit.hover && edit.hover.element !== edit.selected && edit.hover.element !== 'pattern'
    ? edit.boxes[edit.hover.element]
    : null

  // Barre d'outils au-dessus de la sélection (ou en dessous si elle sort du cadre)
  let toolbar = null
  if (selectedBox) {
    const h = boxHandles(selectedBox, handleR * 4)
    const pts = selectedBox.kind === 'pattern' ? h.corners : [...h.corners, h.rotate]
    const topY = Math.min(...pts.map(p => p[1]))
    const bottomY = Math.max(...pts.map(p => p[1]))
    const above = (topY - viewY) * pxPerUnit - 12
    toolbar = {
      left: (selectedBox.cx - viewX) * pxPerUnit,
      top: above > 48 ? above : (bottomY - viewY) * pxPerUnit + 12,
      placeAbove: above > 48,
    }
  }

  return (
    <div
      className="absolute z-20"
      style={{ left: -MARGIN_PX, top: -MARGIN_PX, width: previewW + 2 * MARGIN_PX, height: previewH + 2 * MARGIN_PX }}
    >
      <svg
        ref={svgRef}
        viewBox={`${viewX} ${viewY} ${vb.w + 2 * mU} ${vb.h + 2 * mU}`}
        className="w-full h-full touch-none select-none"
        style={{ cursor }}
        onPointerDown={e => {
          const hit = edit.pointerDown(toSquare(e), handleR, [e.clientX, e.clientY])
          if (hit?.handle) e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerMove={e => setCursor(edit.pointerMove(toSquare(e), handleR, e.altKey))}
        onPointerUp={e => {
          edit.pointerUp([e.clientX, e.clientY])
          if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
          setCursor(edit.pointerMove(toSquare(e), handleR, e.altKey))
        }}
        onDoubleClick={e => edit.doubleClick(toSquare(e), handleR)}
      >
        {/* Repères d'aimantation sur les axes du panneau */}
        {edit.guides.includes('vertical') && (
          <line x1="100" y1={vb.y} x2="100" y2={vb.y + vb.h} stroke="#22d3ee" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" pointerEvents="none" />
        )}
        {edit.guides.includes('horizontal') && (
          <line x1={vb.x} y1="100" x2={vb.x + vb.w} y2="100" stroke="#22d3ee" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" pointerEvents="none" />
        )}
        {hoverBox && (
          <polygon
            points={outlinePoints(hoverBox)} fill="rgba(251,191,36,0.06)" stroke="white" strokeOpacity="0.7"
            strokeWidth="1" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" pointerEvents="none"
          />
        )}
        {selectedBox && <Selection box={selectedBox} handleR={handleR} />}
      </svg>

      {toolbar && (
        <div
          className={`absolute -translate-x-1/2 ${toolbar.placeAbove ? '-translate-y-full' : ''}`}
          style={{ left: toolbar.left, top: toolbar.top }}
        >
          <ElementToolbar element={edit.selected} />
        </div>
      )}
    </div>
  )
}
