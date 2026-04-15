/**
 * Simple row-based nesting.
 * Places pieces left to right on rows, wrapping to next row when board width exceeded.
 * Returns pieces with added { offsetX, offsetY } for placement.
 */
export function nestPieces(pieces, boardWidth, boardHeight, spacing = 5) {
  const laid = []
  let curX = spacing
  let curY = spacing
  let rowHeight = 0

  for (const piece of pieces) {
    const bounds = getBounds(piece.polygon)
    const pw = bounds.maxX - bounds.minX
    const ph = bounds.maxY - bounds.minY

    if (curX + pw > boardWidth - spacing && laid.length > 0) {
      // Wrap to next row
      curX = spacing
      curY += rowHeight + spacing
      rowHeight = 0
    }

    laid.push({
      ...piece,
      offsetX: curX - bounds.minX,
      offsetY: curY - bounds.minY,
    })

    curX += pw + spacing
    rowHeight = Math.max(rowHeight, ph)
  }

  const totalHeight = curY + rowHeight + spacing
  const overflow = totalHeight > boardHeight

  return { laid, overflow, totalHeight }
}

function getBounds(poly) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const [x, y] of poly) {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  return { minX, minY, maxX, maxY }
}
