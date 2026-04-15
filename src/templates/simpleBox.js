import { buildFingerEdge } from '../lib/fingerJoints.js'

export const simpleBox = {
  id: 'simple-box',
  name: 'Boîte simple',
  description: 'Fond + 4 côtés avec encoches. Solide et polyvalent.',
  emoji: '📦',
  defaultParams: {
    width: 150,
    depth: 100,
    height: 60,
    thickness: 6,
    fingerSize: 12,
    kerf: 0.2,
    fingerJoints: true,
  },
  paramSchema: [
    { key: 'width',       label: 'Largeur',          type: 'slider', min: 30,  max: 600, step: 1,    unit: 'mm' },
    { key: 'depth',       label: 'Profondeur',        type: 'slider', min: 30,  max: 600, step: 1,    unit: 'mm' },
    { key: 'height',      label: 'Hauteur',           type: 'slider', min: 15,  max: 400, step: 1,    unit: 'mm' },
    { key: 'fingerSize',  label: 'Taille encoches',   type: 'slider', min: 6,   max: 30,  step: 1,    unit: 'mm' },
    { key: 'kerf',        label: 'Kerf',              type: 'slider', min: 0,   max: 0.5, step: 0.05, unit: 'mm' },
  ],
  computePieces,
}

function computePieces({ width, depth, height, thickness: t, fingerSize, kerf, fingerJoints }) {
  const fs = fingerSize || 12
  const k = kerf || 0

  if (!fingerJoints) {
    return [
      piece('bottom', 'Fond',          rectPoly(0,0,width,depth),   '#3b82f6'),
      piece('front',  'Face avant',    rectPoly(0,0,width,height),  '#ec4899'),
      piece('back',   'Face arrière',  rectPoly(0,0,width,height),  '#f97316'),
      piece('left',   'Côté gauche',   rectPoly(0,0,depth,height),  '#10b981'),
      piece('right',  'Côté droit',    rectPoly(0,0,depth,height),  '#8b5cf6'),
    ]
  }

  // With finger joints:
  // Bottom: full width × depth, tabs on all 4 edges going outward
  // Front/Back: full width × height, slots on bottom edge (receives bottom tabs), tabs on left/right edges
  // Left/Right: depth × height, slots on all 4 edges

  // Bottom piece — tabs protrude outward on all edges
  const bottomPoly = buildFingerRect(width, depth, t, fs, k, {
    bottom: 'tab',  // toward front
    top:    'tab',  // toward back
    left:   'tab',
    right:  'tab',
  }, 'outward')

  // Front piece — bottom edge: slot (receives bottom), left/right: tab
  const frontPoly = buildFingerRect(width, height, t, fs, k, {
    bottom: 'slot', // receives bottom tabs
    top:    'none',
    left:   'tab',
    right:  'tab',
  }, 'outward')

  // Back piece — same as front
  const backPoly = buildFingerRect(width, height, t, fs, k, {
    bottom: 'slot',
    top:    'none',
    left:   'tab',
    right:  'tab',
  }, 'outward')

  // Left side — slots everywhere (receives tabs from bottom, front, back)
  const leftPoly = buildFingerRect(depth, height, t, fs, k, {
    bottom: 'slot',
    top:    'none',
    left:   'slot',
    right:  'slot',
  }, 'inward')

  // Right side — same
  const rightPoly = buildFingerRect(depth, height, t, fs, k, {
    bottom: 'slot',
    top:    'none',
    left:   'slot',
    right:  'slot',
  }, 'inward')

  return [
    piece('bottom', 'Fond',         bottomPoly, '#3b82f6'),
    piece('front',  'Face avant',   frontPoly,  '#ec4899'),
    piece('back',   'Face arrière', backPoly,   '#f97316'),
    piece('left',   'Côté gauche',  leftPoly,   '#10b981'),
    piece('right',  'Côté droit',   rightPoly,  '#8b5cf6'),
  ]
}

function piece(id, label, polygon, color) {
  return { id, label, polygon, holes: [], color }
}

function rectPoly(x, y, w, h) {
  return [[x,y],[x+w,y],[x+w,y+h],[x,y+h]]
}

/**
 * Build a rectangular piece with finger joints.
 * w, h: outer dimensions
 * t: thickness
 * fs: finger size (target width of each finger)
 * k: kerf compensation
 * edges: { top, bottom, left, right } each: 'tab' | 'slot' | 'none'
 * mode: 'outward' (tabs protrude beyond bounding box) | 'inward' (slots cut inside)
 *
 * We walk the perimeter clockwise:
 * bottom edge: (0,0) → (w,0)
 * right edge:  (w,0) → (w,h)
 * top edge:    (w,h) → (0,h)
 * left edge:   (0,h) → (0,0)
 */
function buildFingerRect(w, h, t, fs, k, edges, mode) {
  const pts = []

  // Bottom edge: left to right along x axis
  // Tabs protrude downward (y negative), slots cut upward (y positive)
  appendFingerEdge(pts, 0, 0, w, t, fs, k, edges.bottom, 'x', +1, -1)
  // Right edge: bottom to top along y axis
  // Tabs protrude rightward (x positive), slots cut leftward (x negative)
  appendFingerEdge(pts, w, 0, h, t, fs, k, edges.right, 'y', +1, +1)
  // Top edge: right to left along x axis
  // Tabs protrude upward (y positive), slots cut downward (y negative)
  appendFingerEdge(pts, w, h, w, t, fs, k, edges.top, 'x', -1, +1)
  // Left edge: top to bottom along y axis
  // Tabs protrude leftward (x negative), slots cut rightward (x positive)
  appendFingerEdge(pts, 0, h, h, t, fs, k, edges.left, 'y', -1, -1)

  return pts
}

/**
 * Append finger edge points to pts array.
 * sx, sy: start corner
 * length: edge length
 * t: material thickness
 * fs: target finger size
 * k: kerf compensation (half added to each tab side)
 * type: 'tab' | 'slot' | 'none'
 * axis: 'x' | 'y' (direction of travel along edge)
 * axisDir: +1 or -1
 * notchDir: +1 or -1 (direction perpendicular to edge, outward from piece surface)
 */
function appendFingerEdge(pts, sx, sy, length, t, fs, k, type, axis, axisDir, notchDir) {
  if (type === 'none') {
    // Straight edge
    if (axis === 'x') {
      pts.push([sx + axisDir * length, sy])
    } else {
      pts.push([sx, sy + axisDir * length])
    }
    return
  }

  const count = oddCount(Math.max(3, Math.round(length / fs)))
  const fw = length / count // actual finger width
  const kk = k / 2  // half kerf offset

  for (let i = 0; i < count; i++) {
    const pos = i * fw
    // First and last fingers, and all even-indexed, are "primary" (tab for 'tab', slot for 'slot')
    // Odd-indexed fingers alternate
    const isPrimary = i % 2 === 0

    const tabNow = type === 'tab' ? isPrimary : !isPrimary
    // For 'slot': primary fingers are slots (recessed), odd are flat
    // For 'tab': primary fingers protrude, odd are flat

    if (axis === 'x') {
      const x0 = sx + axisDir * pos
      const y0 = sy
      if (tabNow) {
        // protrude by t in notchDir, expand by kerf
        const x1 = x0 + axisDir * (fw)
        pts.push([x0 - axisDir * kk, y0])
        pts.push([x0 - axisDir * kk, y0 + notchDir * (t + kk)])
        pts.push([x1 + axisDir * kk, y0 + notchDir * (t + kk)])
        pts.push([x1 + axisDir * kk, y0])
      } else {
        // flat — just move along
        pts.push([x0 + axisDir * fw, y0])
      }
    } else {
      const x0 = sx
      const y0 = sy + axisDir * pos
      if (tabNow) {
        const y1 = y0 + axisDir * fw
        pts.push([x0, y0 - axisDir * kk])
        pts.push([x0 + notchDir * (t + kk), y0 - axisDir * kk])
        pts.push([x0 + notchDir * (t + kk), y1 + axisDir * kk])
        pts.push([x0, y1 + axisDir * kk])
      } else {
        pts.push([x0, y0 + axisDir * fw])
      }
    }
  }
}

function oddCount(n) {
  return n % 2 === 0 ? n - 1 : n
}
