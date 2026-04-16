import { useState, useCallback } from 'react'

export function useDrag(initialPos = { x: 0, y: 0 }) {
  const [pos,      setPos]      = useState(initialPos)
  const [dragging, setDragging] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })

  const onMouseDown = useCallback((e) => {
    e.preventDefault()
    setDragging(true)
    setStartPos({ x: e.clientX - pos.x, y: e.clientY - pos.y })
  }, [pos])

  const onMouseMove = useCallback((e) => {
    if (!dragging) return
    setPos({ x: e.clientX - startPos.x, y: e.clientY - startPos.y })
  }, [dragging, startPos])

  const onMouseUp = useCallback(() => setDragging(false), [])

  return { pos, dragging, handlers: { onMouseDown, onMouseMove, onMouseUp } }
}
