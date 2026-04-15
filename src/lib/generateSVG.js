export function generateSVG(pieces, boardWidth = 600, boardHeight = 400, spacing = 5) {
  const { laid } = nestPiecesSimple(pieces, boardWidth, spacing)

  const polylines = laid.map(p => {
    const pts = p.polygon.map(([x, y]) => `${(x + p.offsetX).toFixed(2)},${(y + p.offsetY).toFixed(2)}`).join(' ')
    const holesSVG = (p.holes || []).map(hole => {
      const hpts = hole.map(([x, y]) => `${(x + p.offsetX).toFixed(2)},${(y + p.offsetY).toFixed(2)}`).join(' ')
      return `<polygon points="${hpts}" fill="none" stroke="#000" stroke-width="0.5"/>`
    }).join('')

    const cx = p.polygon.reduce((s, [x]) => s + x, 0) / p.polygon.length + p.offsetX
    const cy = p.polygon.reduce((s, [, y]) => s + y, 0) / p.polygon.length + p.offsetY

    return `<g>
  <polygon points="${pts}" fill="${p.color}22" stroke="${p.color}" stroke-width="0.8"/>
  ${holesSVG}
  <text x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="5" fill="${p.color}">${p.label}</text>
</g>`
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${boardWidth} ${boardHeight}" width="${boardWidth}mm" height="${boardHeight}mm">
${polylines}
</svg>`
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
