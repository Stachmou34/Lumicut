// Helpers Fabric.js v7 — ajout d'éléments sur le canvas
// Fabric est importé dynamiquement dans PanelEditor, ces fonctions
// reçoivent les classes en paramètre ou les importent à la demande.

// Ajoute un motif SVG centré sur le canvas (async v7)
export async function addSVGMotif(canvas, svgString) {
  const { loadSVGFromString, Group } = await import('fabric')
  const { objects } = await loadSVGFromString(svgString)

  const valid = objects.filter(Boolean)
  if (valid.length === 0) return

  const group = new Group(valid, {
    originX: 'center',
    originY: 'center',
    name:    'motif',
  })

  group.getObjects().forEach(obj => {
    obj.set({ fill: 'black', stroke: null, strokeWidth: 0 })
  })

  const maxW  = canvas.width  * 0.6
  const maxH  = canvas.height * 0.6
  const scale = Math.min(maxW / (group.width || 1), maxH / (group.height || 1))

  group.set({
    left:          canvas.width  / 2,
    top:           canvas.height / 2,
    scaleX:        scale,
    scaleY:        scale,
    minScaleLimit: 0.05,
  })

  canvas.add(group)
  canvas.setActiveObject(group)
  canvas.requestRenderAll()
}

// Ajoute un bloc texte centré sur le canvas
export async function addTextBlock(canvas, content = 'Votre texte', fontFamily = 'Arial') {
  const { Text } = await import('fabric')
  const text = new Text(content, {
    left:       canvas.width  / 2,
    top:        canvas.height / 2,
    originX:    'center',
    originY:    'center',
    fontSize:   48,
    fontFamily,
    fill:       'black',
    name:       'text',
  })
  canvas.add(text)
  canvas.setActiveObject(text)
  canvas.requestRenderAll()
}

// Ajoute le rectangle de référence du panneau (non interactif)
export async function addPanelBorder(canvas, widthMM, heightMM) {
  const { Rect } = await import('fabric')

  const existing = canvas.getObjects().find(o => o.name === 'panel_border')
  if (existing) canvas.remove(existing)

  const scale = Math.min(
    (canvas.width  * 0.85) / widthMM,
    (canvas.height * 0.85) / heightMM
  )

  const rect = new Rect({
    left:            canvas.width  / 2,
    top:             canvas.height / 2,
    originX:         'center',
    originY:         'center',
    width:           widthMM  * scale,
    height:          heightMM * scale,
    fill:            'transparent',
    stroke:          '#3b82f6',
    strokeWidth:     2,
    strokeDashArray: [8, 4],
    selectable:      false,
    evented:         false,
    name:            'panel_border',
  })

  canvas.add(rect)
  canvas.sendObjectToBack(rect)
  canvas.requestRenderAll()

  return scale
}
