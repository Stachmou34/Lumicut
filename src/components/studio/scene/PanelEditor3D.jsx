import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { Html, Line } from '@react-three/drei'
import { useElementEditing } from '../../../lib/useElementEditing'
import { boxHandles } from '../../../lib/panelEditing'
import { panelExtents } from '../../../lib/panelLayout'
import ElementToolbar from '../ElementToolbar'

const HANDLE_PX = 7

// Édition directe dans la vue 3D, dans le repère du panneau (support en z = 0, face vers +z).
// Un plan invisible devant la face reçoit le pointeur ; les poignées sont dessinées par-dessus.
export default function PanelEditor3D({ design, gap, thickness }) {
  const edit = useElementEditing(design)
  const controls = useThree(s => s.controls)
  const gl = useThree(s => s.gl)
  const camera = useThree(s => s.camera)
  const size = useThree(s => s.size)
  const plane = useRef(null)
  const [handleR, setHandleR] = useState(5)
  const handleRef = useRef(5)

  const unitM = Math.min(design.width, design.height) / 200 / 100 // mètres par unité du repère 200
  const z = gap + thickness + 0.003
  const W = design.width / 100
  const H = design.height / 100
  const toLocal = ([sx, sy]) => [(sx - 100) * unitM, -(sy - 100) * unitM]

  // Poignées d'une taille constante à l'écran, quelle que soit la distance de la caméra
  useFrame(() => {
    if (!plane.current) return
    const center = new THREE.Vector3(0, 0, z).applyMatrix4(plane.current.parent.matrixWorld)
    const d = camera.position.distanceTo(center)
    const worldPerPx = (2 * d * Math.tan((camera.fov * Math.PI) / 360)) / size.height
    const r = (HANDLE_PX * worldPerPx) / unitM
    if (Math.abs(r - handleRef.current) / handleRef.current > 0.12) {
      handleRef.current = r
      setHandleR(r)
    }
  })

  // Rayon du pointeur → point du repère 200 (intersection avec le plan de la face avant)
  const toSquare = e => {
    const mesh = plane.current
    if (!mesh) return null
    const normal = new THREE.Vector3(0, 0, 1).transformDirection(mesh.matrixWorld)
    const origin = new THREE.Vector3().setFromMatrixPosition(mesh.matrixWorld)
    const hit = e.ray.intersectPlane(new THREE.Plane().setFromNormalAndCoplanarPoint(normal, origin), new THREE.Vector3())
    if (!hit) return null
    const local = mesh.worldToLocal(hit)
    return [100 + local.x / unitM, 100 - local.y / unitM]
  }

  const setCursor = c => { gl.domElement.style.cursor = c }

  const selectedBox = edit.selected && edit.boxes[edit.selected]
  const hoverBox = edit.hover && edit.hover.element !== edit.selected && edit.hover.element !== 'pattern'
    ? edit.boxes[edit.hover.element]
    : null

  const selection = useMemo(() => {
    if (!selectedBox) return null
    const h = boxHandles(selectedBox, handleR * 4)
    const corners = h.corners.map(toLocal)
    const pts = selectedBox.kind === 'pattern' ? h.corners : [...h.corners, h.rotate]
    const top = toLocal([selectedBox.cx, Math.min(...pts.map(p => p[1]))])
    return {
      outline: [...corners, corners[0]].map(([x, y]) => [x, y, z]),
      corners,
      rotate: toLocal(h.rotate),
      stem: [toLocal(h.topCenter), toLocal(h.rotate)].map(([x, y]) => [x, y, z]),
      toolbar: [top[0], top[1] + handleR * unitM * 3, z],
    }
  }, [selectedBox, handleR, unitM, z]) // eslint-disable-line react-hooks/exhaustive-deps

  const hoverOutline = useMemo(() => {
    if (!hoverBox) return null
    const corners = boxHandles(hoverBox, 0).corners.map(toLocal)
    return [...corners, corners[0]].map(([x, y]) => [x, y, z])
  }, [hoverBox, unitM, z]) // eslint-disable-line react-hooks/exhaustive-deps

  const e = panelExtents(design.width, design.height)
  const r = handleR * unitM
  const overlayMat = { depthTest: false, toneMapped: false }

  // Outils d'édition (plan de saisie, repères, sélection) : rendu temps réel seulement, le rendu
  // physique ne doit pas les prendre pour des objets de la pièce
  return (
    <group userData={{ rasterOnly: true }}>
      {/* Plan de saisie du pointeur, plus grand que le panneau pour attraper les poignées au bord */}
      <mesh
        ref={plane}
        position={[0, 0, z]}
        onPointerDown={ev => {
          const p = toSquare(ev)
          if (!p) return
          const hit = edit.pointerDown(p, handleRef.current, [ev.clientX, ev.clientY])
          if (hit?.handle) {
            ev.stopPropagation()
            if (controls) controls.enabled = false // coupe l'orbite pendant le geste
            ev.target.setPointerCapture(ev.pointerId)
          }
        }}
        onPointerMove={ev => {
          const p = toSquare(ev)
          if (!p) return
          setCursor(edit.pointerMove(p, handleRef.current, ev.altKey))
          if (edit.isDragging()) ev.stopPropagation()
        }}
        onPointerUp={ev => {
          if (edit.pointerUp([ev.clientX, ev.clientY])) {
            if (controls) controls.enabled = true
            ev.target.releasePointerCapture(ev.pointerId)
          }
        }}
        onPointerLeave={() => { if (!edit.isDragging()) setCursor('') }}
        onDoubleClick={ev => {
          const p = toSquare(ev)
          if (p) edit.doubleClick(p, handleRef.current)
        }}
      >
        <planeGeometry args={[W * 1.6, H * 1.6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>

      {/* Repères d'aimantation */}
      {edit.guides.includes('vertical') && (
        <Line points={[[0, (e.y1 - 100) * unitM, z], [0, (e.y0 - 100) * unitM, z]]} color="#22d3ee" lineWidth={1.5} dashed dashSize={0.01} gapSize={0.008} {...overlayMat} renderOrder={20} />
      )}
      {edit.guides.includes('horizontal') && (
        <Line points={[[(e.x0 - 100) * unitM, 0, z], [(e.x1 - 100) * unitM, 0, z]]} color="#22d3ee" lineWidth={1.5} dashed dashSize={0.01} gapSize={0.008} {...overlayMat} renderOrder={20} />
      )}

      {/* Survol */}
      {hoverOutline && (
        <Line points={hoverOutline} color="white" lineWidth={1.2} dashed dashSize={0.012} gapSize={0.008} transparent opacity={0.8} {...overlayMat} renderOrder={20} />
      )}

      {/* Sélection : contour, coins, poignée de rotation et barre d'outils */}
      {selection && (
        <>
          <Line points={selection.outline} color="#fbbf24" lineWidth={2} {...overlayMat} renderOrder={21} />
          {selectedBox.kind !== 'pattern' && (
            <>
              <Line points={selection.stem} color="#fbbf24" lineWidth={2} {...overlayMat} renderOrder={21} />
              <mesh position={[selection.rotate[0], selection.rotate[1], z]} renderOrder={22}>
                <circleGeometry args={[r, 24]} />
                <meshBasicMaterial color="#fbbf24" {...overlayMat} />
              </mesh>
              {selection.corners.map(([x, y], i) => (
                <group key={i} position={[x, y, z]}>
                  <mesh renderOrder={22}>
                    <planeGeometry args={[r * 2.3, r * 2.3]} />
                    <meshBasicMaterial color="#f59e0b" {...overlayMat} />
                  </mesh>
                  <mesh renderOrder={23}>
                    <planeGeometry args={[r * 1.7, r * 1.7]} />
                    <meshBasicMaterial color="white" {...overlayMat} />
                  </mesh>
                </group>
              ))}
            </>
          )}
          <Html position={selection.toolbar} center zIndexRange={[40, 0]}>
            <div className="-translate-y-1/2">
              <ElementToolbar element={edit.selected} />
            </div>
          </Html>
        </>
      )}
    </group>
  )
}
