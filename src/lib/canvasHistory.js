// Undo/redo pour Fabric.js canvas

export function createHistory(canvas) {
  const stack  = []
  let index    = -1
  let paused   = false

  function snapshot() {
    if (paused) return
    const state = JSON.stringify(canvas.toJSON(['name', 'selectable', 'evented']))
    // Tronquer le futur si on est en milieu d'historique
    stack.splice(index + 1)
    stack.push(state)
    // Limiter à 50 états
    if (stack.length > 50) stack.shift()
    index = stack.length - 1
  }

  function restore(state) {
    paused = true
    canvas.loadFromJSON(JSON.parse(state), () => {
      canvas.renderAll()
      paused = false
    })
  }

  // Sauvegarder après chaque modification
  canvas.on('object:added',    snapshot)
  canvas.on('object:modified', snapshot)
  canvas.on('object:removed',  snapshot)

  // Premier snapshot (état initial)
  snapshot()

  return {
    undo() {
      if (index <= 0) return
      index--
      restore(stack[index])
    },
    redo() {
      if (index >= stack.length - 1) return
      index++
      restore(stack[index])
    },
    canUndo: () => index > 0,
    canRedo: () => index < stack.length - 1,
  }
}
