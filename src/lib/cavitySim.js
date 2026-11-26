// Lumière dans le creux du panneau en U, par tracé de photons (méthode de Monte-Carlo).
// Sert à étudier ce que change la couleur du dos du panneau (façade vue de dos et intérieur des bords du U) :
// le ruban éclaire le mur, le mur renvoie la lumière vers le dos du panneau, qui la renvoie vers le mur…
// Avec un dos sombre, presque toute cette lumière renvoyée est perdue ; avec un dos clair, elle fait des
// allers-retours et gagne le centre du panneau, derrière le motif.
// Chaque photon part de la face lumineuse du ruban (émission lambertienne vers le mur) et rebondit
// jusqu'à être absorbé, sortir par les découpes du motif ou s'échapper dans la pièce par la fente
// entre le panneau et le mur. On compte la lumière reçue par le mur, point par point.
// Repère du panneau : mur en z = 0, panneau vu de face, origine au centre, mètres.
// Fonctions pures et reproductibles (générateur pseudo-aléatoire à graine).

// Générateur pseudo-aléatoire rapide et reproductible (mulberry32)
export function seededRandom(seed = 1) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Réflexion d'une surface :
// - diffuse : part renvoyée dans toutes les directions (peinture mate, bois, film blanc diffusant) ;
// - index : indice de réfraction d'un vernis ou d'une matière brillante (acrylique : 1,49), qui ajoute un
//   reflet de Fresnel (environ 4 % de face, beaucoup plus en lumière rasante) ;
// - mirror : part renvoyée en miroir (film aluminium, miroir).
export const SURFACES = {
  // Acrylique noir brillant : presque rien de diffus, le reflet de la surface (indice 1,49, environ 4 %
  // de face selon les fiches du PMMA)
  blackAcrylic: { diffuse: 0.01, index: 1.49, mirror: 0 },
  // Contreplaqué de bouleau brut : estimation d'après la teinte du site (aucune valeur publiée trouvée)
  birch: { diffuse: 0.47, index: 0, mirror: 0 },
  // Peinture blanche mate : facteur de réflexion lumineuse (LRV) des blancs purs du commerce, 84 à 90
  whitePaint: { diffuse: 0.85, index: 0, mirror: 0 },
  // Film réflecteur blanc diffusant pour luminaires : 98 % annoncés (WhiteOptics F16)
  whiteFilm: { diffuse: 0.98, index: 0, mirror: 0 },
  // Papier aluminium ménager, face brillante : environ 86 % dans le visible (mesure publiée), surtout en miroir
  aluminium: { diffuse: 0, index: 0, mirror: 0.86 },
}

// Reflet de Fresnel d'un diélectrique (lumière non polarisée) pour un cosinus d'incidence donné
export function fresnel(cosI, n) {
  const c = Math.min(1, Math.max(0, cosI))
  const sinT = Math.sqrt(Math.max(0, 1 - c * c)) / n
  if (sinT >= 1) return 1
  const cosT = Math.sqrt(1 - sinT * sinT)
  const rs = (c - n * cosT) / (c + n * cosT)
  const rp = (n * c - cosT) / (n * c + cosT)
  return (rs * rs + rp * rp) / 2
}

// Géométrie du creux. Mesures en mètres :
// width, height : panneau ; face : épaisseur de la façade et des bords ; depth : profondeur totale du U ;
// gap : déport (mur → dos du U) ; stripW, stripH : section du ruban ; emitShare : part lumineuse de sa largeur.
export function cavityGeometry({ width, height, face = 0.004, depth = 0.02, gap = 0.03, stripW = 0.0145, stripH = 0.006, emitShare = 0.6 }) {
  const hw = width / 2
  const hh = height / 2
  const R = face
  const faceBack = gap + depth - face
  const zLed = faceBack - stripH
  const sw = stripW
  // Boîtes pleines : façade, bords du U, ruban (collé au fond du creux, contre les bords)
  const boxes = [
    { kind: 'face', min: [-hw, -hh, faceBack], max: [hw, hh, faceBack + face] },
    { kind: 'rim', min: [-hw, hh - R, gap], max: [hw, hh, faceBack] },
    { kind: 'rim', min: [-hw, -hh, gap], max: [hw, -hh + R, faceBack] },
    { kind: 'rim', min: [-hw, -hh + R, gap], max: [-hw + R, hh - R, faceBack] },
    { kind: 'rim', min: [hw - R, -hh + R, gap], max: [hw, hh - R, faceBack] },
    { kind: 'strip', min: [-hw + R, hh - R - sw, zLed], max: [hw - R, hh - R, faceBack] },
    { kind: 'strip', min: [-hw + R, -hh + R, zLed], max: [hw - R, -hh + R + sw, faceBack] },
    { kind: 'strip', min: [-hw + R, -hh + R + sw, zLed], max: [-hw + R + sw, hh - R - sw, faceBack] },
    { kind: 'strip', min: [hw - R - sw, -hh + R + sw, zLed], max: [hw - R, hh - R - sw, faceBack] },
  ]
  // Faces lumineuses : bande du milieu du dessous du ruban, le long du tour (sans recouvrement aux coins)
  const e = sw * emitShare
  const cx = hw - R - sw / 2
  const cy = hh - R - sw / 2
  const emitters = [
    { x0: -cx - e / 2, x1: cx + e / 2, y0: cy - e / 2, y1: cy + e / 2 },
    { x0: -cx - e / 2, x1: cx + e / 2, y0: -cy - e / 2, y1: -cy + e / 2 },
    { x0: -cx - e / 2, x1: -cx + e / 2, y0: -cy + e / 2, y1: cy - e / 2 },
    { x0: cx - e / 2, x1: cx + e / 2, y0: -cy + e / 2, y1: cy - e / 2 },
  ].map(r => ({ ...r, area: (r.x1 - r.x0) * (r.y1 - r.y0) }))
  return { hw, hh, R, gap, faceBack, zLed, boxes, emitters, emitArea: emitters.reduce((s, r) => s + r.area, 0) }
}

// Simulation. Options :
// back : surface du dos de la façade et de l'intérieur des bords du U ; rimEdge : tranche des bords (côté mur) ;
// outside : extérieur du panneau ; strip : ruban (silicone blanc) ; wall : réflectance du mur (diffus) ;
// open : part de la façade ouverte par les découpes du motif (répartie uniformément) ;
// photons, seed ; margin et bin : zone et maille du relevé sur le mur (m).
// Renvoie l'éclairement du mur par maille (en unités de la luminance du ruban), celui de la seule lumière
// directe, et le bilan : part du flux sortie par le motif, sortie dans la pièce, absorbée.
export function simulateCavity(geometryParams, {
  back = SURFACES.blackAcrylic, rimEdge = SURFACES.blackAcrylic, outside = SURFACES.blackAcrylic,
  strip = { diffuse: 0.7, index: 0, mirror: 0 }, wall = 0.8, open = 0.1,
  photons = 200000, seed = 1, margin = 0.15, bin = 0.005, maxBounces = 400,
} = {}) {
  const g = cavityGeometry(geometryParams)
  const rand = seededRandom(seed)
  const nx = Math.ceil((2 * (g.hw + margin)) / bin)
  const ny = Math.ceil((2 * (g.hh + margin)) / bin)
  const x0 = -nx * bin / 2
  const y0 = -ny * bin / 2
  const hits = new Float64Array(nx * ny)
  const direct = new Float64Array(nx * ny)
  const bmin = g.boxes.map(b => b.min)
  const bmax = g.boxes.map(b => b.max)
  const kinds = g.boxes.map(b => b.kind)
  const nb = g.boxes.length
  const budget = { motif: 0, room: 0, absorbedWall: 0, absorbedBack: 0, absorbedStrip: 0, absorbedOther: 0, wallInside: 0, wallOutside: 0 }
  const p = [0, 0, 0]
  const d = [0, 0, 0]
  const n = [0, 0, 0]
  const EPS = 1e-7

  // Nouvelle direction diffuse (loi du cosinus) autour de la normale n
  const diffuseDir = () => {
    const u1 = rand()
    const u2 = rand()
    const r = Math.sqrt(u1)
    const phi = 2 * Math.PI * u2
    const lx = r * Math.cos(phi)
    const ly = r * Math.sin(phi)
    const lz = Math.sqrt(Math.max(0, 1 - u1))
    // Repère orthonormé autour de n
    const ax = Math.abs(n[0]) > 0.9 ? [0, 1, 0] : [1, 0, 0]
    const tx = [ax[1] * n[2] - ax[2] * n[1], ax[2] * n[0] - ax[0] * n[2], ax[0] * n[1] - ax[1] * n[0]]
    const tl = Math.hypot(tx[0], tx[1], tx[2])
    tx[0] /= tl; tx[1] /= tl; tx[2] /= tl
    const by = [n[1] * tx[2] - n[2] * tx[1], n[2] * tx[0] - n[0] * tx[2], n[0] * tx[1] - n[1] * tx[0]]
    for (let k = 0; k < 3; k++) d[k] = tx[k] * lx + by[k] * ly + n[k] * lz
  }

  // Rebond sur une surface : reflet (Fresnel ou miroir), sinon diffus, sinon absorbé ; renvoie false si absorbé
  const bounce = surf => {
    const cosI = -(d[0] * n[0] + d[1] * n[1] + d[2] * n[2])
    const spec = surf.index ? fresnel(cosI, surf.index) : surf.mirror
    const u = rand()
    if (u < spec) {
      for (let k = 0; k < 3; k++) d[k] += 2 * cosI * n[k]
      return true
    }
    if (u < spec + (1 - spec) * surf.diffuse) {
      diffuseDir()
      return true
    }
    return false
  }

  for (let i = 0; i < photons; i++) {
    // Départ : un point de la face lumineuse du ruban, direction lambertienne vers le mur
    let r = rand() * g.emitArea
    let em = g.emitters[0]
    for (const e of g.emitters) {
      if (r <= e.area) { em = e; break }
      r -= e.area
    }
    p[0] = em.x0 + rand() * (em.x1 - em.x0)
    p[1] = em.y0 + rand() * (em.y1 - em.y0)
    p[2] = g.zLed - EPS
    n[0] = 0; n[1] = 0; n[2] = -1
    diffuseDir()
    let first = true

    for (let step = 0; step < maxBounces; step++) {
      // Obstacle le plus proche : le mur, ou une face d'une des boîtes
      let tBest = Infinity
      let hit = -2
      let axis = 2
      let sign = 1
      if (d[2] < 0) {
        tBest = -p[2] / d[2]
        hit = -1
      }
      for (let b = 0; b < nb; b++) {
        const mn = bmin[b]
        const mx = bmax[b]
        let tIn = -Infinity
        let tOut = Infinity
        let ax = -1
        let sg = 0
        let miss = false
        for (let k = 0; k < 3; k++) {
          if (Math.abs(d[k]) < 1e-15) {
            if (p[k] < mn[k] || p[k] > mx[k]) { miss = true; break }
            continue
          }
          let t1 = (mn[k] - p[k]) / d[k]
          let t2 = (mx[k] - p[k]) / d[k]
          let s = -1
          if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; s = 1 }
          if (t1 > tIn) { tIn = t1; ax = k; sg = s }
          if (t2 < tOut) tOut = t2
          if (tIn > tOut) { miss = true; break }
        }
        if (miss || tIn <= EPS || tIn >= tBest || ax < 0) continue
        tBest = tIn
        hit = b
        axis = ax
        sign = sg
      }
      if (hit === -2) {
        budget.room++
        break
      }
      for (let k = 0; k < 3; k++) p[k] += d[k] * tBest

      if (hit === -1) {
        // Mur : relevé de la lumière reçue, puis réflexion diffuse
        const ix = Math.floor((p[0] - x0) / bin)
        const iy = Math.floor((p[1] - y0) / bin)
        if (ix >= 0 && ix < nx && iy >= 0 && iy < ny) {
          hits[iy * nx + ix]++
          if (first) direct[iy * nx + ix]++
        }
        if (Math.abs(p[0]) < g.hw && Math.abs(p[1]) < g.hh) budget.wallInside++
        else budget.wallOutside++
        first = false
        n[0] = 0; n[1] = 0; n[2] = 1
        p[2] = EPS
        if (rand() < wall) {
          diffuseDir()
          continue
        }
        budget.absorbedWall++
        break
      }

      first = false
      // Normale de la face touchée (sortante de la boîte)
      n[0] = 0; n[1] = 0; n[2] = 0
      n[axis] = sign
      for (let k = 0; k < 3; k++) p[k] += n[k] * EPS
      const kind = kinds[hit]
      let surf
      let absorbed = 'absorbedOther'
      if (kind === 'face') {
        if (axis === 2 && sign < 0) {
          // Dos de la façade : une découpe du motif laisse sortir la lumière, sinon le revêtement du dos
          if (rand() < open) {
            budget.motif++
            break
          }
          surf = back
          absorbed = 'absorbedBack'
        } else {
          surf = outside
        }
      } else if (kind === 'rim') {
        if (axis === 2) {
          surf = rimEdge
        } else {
          // Face intérieure du bord (tournée vers le centre) : revêtement du dos ; extérieure : matière
          const inner = sign * p[axis] < 0
          surf = inner ? back : outside
          if (inner) absorbed = 'absorbedBack'
        }
      } else {
        surf = strip
        absorbed = 'absorbedStrip'
      }
      if (!bounce(surf)) {
        budget[absorbed]++
        break
      }
    }
  }

  // Éclairement par maille : flux d'un photon (luminance 1 × π × surface lumineuse / nombre de photons) / maille
  const power = (Math.PI * g.emitArea) / photons
  const scale = power / (bin * bin)
  const E = Float64Array.from(hits, v => v * scale)
  const Ed = Float64Array.from(direct, v => v * scale)
  const share = {}
  for (const [k, v] of Object.entries(budget)) share[k] = v / photons
  return { geometry: g, nx, ny, x0, y0, bin, E, direct: Ed, share, photons }
}

// Éclairement moyen du mur sur un rectangle (m), à partir du relevé
export function meanIrradiance(result, { x0, x1, y0, y1 }, field = 'E') {
  const { nx, ny, bin } = result
  let s = 0
  let c = 0
  for (let iy = 0; iy < ny; iy++) {
    const y = result.y0 + (iy + 0.5) * bin
    if (y < y0 || y > y1) continue
    for (let ix = 0; ix < nx; ix++) {
      const x = result.x0 + (ix + 0.5) * bin
      if (x < x0 || x > x1) continue
      s += result[field][iy * nx + ix]
      c++
    }
  }
  return c ? s / c : 0
}
