import { DxfWriter, point2d, LWPolylineFlags } from '@tarikjabiri/dxf'

export function generateDXF(pieces, boardWidth, boardHeight, spacing = 5) {
  const { laid } = nestPiecesSimple(pieces, boardWidth, spacing)

  const dxf = new DxfWriter()

  for (const p of laid) {
    // Add a layer per piece
    dxf.addLayer(p.label, 7, 'Continuous')
    dxf.setCurrentLayerName(p.label)

    // Build LWPolyline vertices
    const polyPts = p.polygon.map(([x, y]) => ({
      point: point2d(x + p.offsetX, y + p.offsetY),
    }))
    dxf.addLWPolyline(polyPts, { flags: LWPolylineFlags.Closed })

    // Holes (if any)
    for (const hole of (p.holes || [])) {
      const holePts = hole.map(([x, y]) => ({
        point: point2d(x + p.offsetX, y + p.offsetY),
      }))
      dxf.addLWPolyline(holePts, { flags: LWPolylineFlags.Closed })
    }
  }

  return dxf.stringify()
}

function nestPiecesSimple(pieces, boardWidth, spacing) {
  let curX = spacing
  const laid = pieces.map(piece => {
    const xs = piece.polygon.map(([x]) => x)
    const ys = piece.polygon.map(([, y]) => y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const offsetX = curX - minX
    const offsetY = -Math.min(...ys)
    curX += (maxX - minX) + spacing
    return { ...piece, offsetX, offsetY }
  })
  return { laid }
}
