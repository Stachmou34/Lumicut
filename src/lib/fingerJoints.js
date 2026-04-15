// Re-export the finger edge builder used internally by templates
export function buildFingerEdge(length, t, fs, k, type) {
  // Returns points along one edge
  // This is exposed for potential external use / testing
  const pts = []
  const count = oddCount(Math.max(3, Math.round(length / fs)))
  const fw = length / count
  const kk = k / 2
  let x = 0
  for (let i = 0; i < count; i++) {
    const isPrimary = i % 2 === 0
    const tabNow = type === 'tab' ? isPrimary : !isPrimary
    if (tabNow) {
      pts.push({ x, y: 0 })
      pts.push({ x, y: -t - kk })
      pts.push({ x: x + fw, y: -t - kk })
      pts.push({ x: x + fw, y: 0 })
    } else {
      pts.push({ x, y: 0 })
      pts.push({ x: x + fw, y: 0 })
    }
    x += fw
  }
  return pts
}

function oddCount(n) {
  return n % 2 === 0 ? n - 1 : n
}
