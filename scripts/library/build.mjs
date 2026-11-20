// Construit la bibliothèque de motifs réels : public/library/index.json, public/library/svg/*.svg
// (silhouette prête à découper) et public/library/forme/*.svg (forme d'origine, base des styles de découpe)
//
// Usage (le serveur de développement doit tourner : npm run dev) :
//   node scripts/library/build.mjs                 → tous les motifs de selection.json
//   node scripts/library/build.mjs cerf-elaphe lion → seulement ces motifs (l'index est mis à jour)
// Variables : LIBRARY_DEV_URL (défaut http://localhost:5173)
// Derrière un proxy d'entreprise, lancer Node avec NODE_USE_ENV_PROXY=1.
// Prérequis : Playwright et Chromium (npx playwright install chromium).

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { constellationSvg } from './constellations.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '../..')
const CACHE = path.join(HERE, '.cache')
const OUT = path.join(ROOT, 'public', 'library')
const DEV_URL = process.env.LIBRARY_DEV_URL || 'http://localhost:5173'
const UA = 'LumiCut-motif-library/1.0 (bibliotheque de motifs)'

// Paquets npm de données, versions figées pour que la bibliothèque soit reproductible
const NPM = {
  'game-icons': '@iconify-json/game-icons@1.2.4',
  'd3-celestial': 'd3-celestial@0.7.35',
}

const selection = JSON.parse(fs.readFileSync(path.join(HERE, 'selection.json'), 'utf8'))
const only = new Set(process.argv.slice(2))
const todo = selection.motifs.filter(m => !only.size || only.has(m.id))

fs.mkdirSync(CACHE, { recursive: true })

async function download(url) {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' })
      if (r.ok) return await r.text()
    } catch {
      // nouvel essai ci-dessous
    }
    await new Promise(res => setTimeout(res, 1000 * (i + 1)))
  }
  throw new Error(`Téléchargement impossible : ${url}`)
}

// Paquet npm extrait dans le cache (npm pack + tar, disponibles partout où npm l'est)
function npmPackage(name) {
  const dir = path.join(CACHE, 'npm', name)
  if (fs.existsSync(path.join(dir, 'package'))) return path.join(dir, 'package')
  fs.mkdirSync(dir, { recursive: true })
  const tgz = execFileSync('npm', ['pack', NPM[name], '--silent'], { cwd: dir, encoding: 'utf8', shell: process.platform === 'win32' }).trim().split('\n').pop()
  execFileSync('tar', ['-xzf', tgz], { cwd: dir })
  return path.join(dir, 'package')
}

async function cached(file, produce) {
  const p = path.join(CACHE, file)
  if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8')
  const text = await produce()
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, text)
  return text
}

let iconSets = {}
let celestial = null

// SVG d'origine d'un motif, selon sa source
async function rawSvg(m) {
  const s = m.source
  if (s.type === 'phylopic') {
    return cached(`phylopic/${s.uuid}.svg`, () => download(`https://images.phylopic.org/images/${s.uuid}/vector.svg`))
  }
  if (s.type === 'wikimedia') {
    return cached(`wikimedia/${m.id}.svg`, () => download(s.url))
  }
  if (s.type === 'iconify') {
    if (!iconSets[s.set]) iconSets[s.set] = JSON.parse(fs.readFileSync(path.join(npmPackage(s.set), 'icons.json'), 'utf8'))
    const set = iconSets[s.set]
    const icon = set.icons[s.icon] ?? set.icons[set.aliases?.[s.icon]?.parent]
    if (!icon) throw new Error(`Icône absente : ${s.set}:${s.icon}`)
    const w = icon.width ?? set.width ?? 16
    const h = icon.height ?? set.height ?? 16
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${icon.body}</svg>`
  }
  if (s.type === 'constellation') {
    if (!celestial) {
      const data = path.join(npmPackage('d3-celestial'), 'data')
      celestial = {
        lines: JSON.parse(fs.readFileSync(path.join(data, 'constellations.lines.json'), 'utf8')),
        stars: JSON.parse(fs.readFileSync(path.join(data, 'stars.6.json'), 'utf8')),
      }
    }
    return constellationSvg(celestial, s.iau)
  }
  throw new Error(`Source inconnue : ${s.type}`)
}

async function main() {
  let chromium
  try {
    // createRequire : trouve aussi une installation globale de Playwright (NODE_PATH)
    ({ chromium } = createRequire(import.meta.url)('playwright'))
  } catch {
    console.error('Playwright est nécessaire : npm i -D playwright puis npx playwright install chromium')
    process.exit(1)
  }

  console.log(`Sources de ${todo.length} motifs…`)
  const jobs = []
  for (const m of todo) {
    try {
      // Les constellations sont déjà des traits et des points : pas de styles de découpe
      jobs.push({ id: m.id, svg: await rawSvg(m), styles: m.source.type !== 'constellation' })
    } catch (e) {
      console.error(`✗ ${m.id} : ${e.message}`)
    }
  }

  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto(`${DEV_URL}/package.json`)
  const results = []
  // Préparation et contrôle dans le navigateur (paper.js, canvas), par paquets de 8
  for (let i = 0; i < jobs.length; i += 8) {
    const batch = jobs.slice(i, i + 8)
    const out = await page.evaluate(async (batch) => {
      const { prepareMotif } = await import('/src/lib/library/prepareMotif.js')
      const { analyzeCut } = await import('/src/lib/cutAnalysis.js')
      // Contrôle comme dans le studio : motif à 90 % d'un panneau carré
      const design = (svg, sideCm) => ({
        svg, width: sideCm / 0.9, height: sideCm / 0.9, motifScale: 90, motifX: 0, motifY: 0, motifRotation: 0,
        motifMirrorH: false, motifMirrorV: false, showText: false, holes: [],
      })
      const res = []
      for (const job of batch) {
        try {
          const prepared = prepareMotif(job.svg)
          // Forme d'origine (fusionnée, au repère 200, sans ponts) : base des styles de découpe
          const forme = job.styles ? prepareMotif(job.svg, { fix: false }).svg : null
          const M = await analyzeCut(design(prepared.svg, 27), { minBridgeMm: 3 })
          const S = await analyzeCut(design(prepared.svg, 18), { minBridgeMm: 2.5 })
          const count = a => ({ islands: a.islands.length, fragile: a.fragile.length, thin: a.thin.length })
          res.push({
            id: job.id,
            svg: prepared.svg,
            forme,
            fix: { bridges: prepared.report.bridges.length, filled: prepared.report.filled + prepared.report.specks },
            check: { M: count(M), S: count(S) },
          })
        } catch (e) {
          res.push({ id: job.id, error: String(e.message || e) })
        }
      }
      return res
    }, batch)
    results.push(...out)
    process.stdout.write(`\r${Math.min(i + 8, jobs.length)} / ${jobs.length}`)
  }
  process.stdout.write('\n')
  await browser.close()

  // Écriture : un SVG par motif, et l'index (les motifs non reconstruits gardent leur entrée)
  fs.mkdirSync(path.join(OUT, 'svg'), { recursive: true })
  fs.mkdirSync(path.join(OUT, 'forme'), { recursive: true })
  const indexFile = path.join(OUT, 'index.json')
  const previous = fs.existsSync(indexFile) ? JSON.parse(fs.readFileSync(indexFile, 'utf8')) : { motifs: [] }
  const byId = new Map(previous.motifs.map(m => [m.id, m]))
  let rejected = 0
  for (const r of results) {
    const m = selection.motifs.find(x => x.id === r.id)
    if (r.error || r.check.M.islands > 0) {
      // Un motif dont un morceau tomberait au format M n'entre pas dans la bibliothèque
      console.error(`✗ ${r.id} : ${r.error ?? `${r.check.M.islands} îlot(s) au format M`}`)
      byId.delete(r.id)
      rejected++
      continue
    }
    fs.writeFileSync(path.join(OUT, 'svg', `${r.id}.svg`), r.svg)
    if (r.forme) fs.writeFileSync(path.join(OUT, 'forme', `${r.id}.svg`), r.forme)
    byId.set(r.id, {
      id: m.id,
      name: m.name,
      category: m.category,
      tags: m.tags,
      source: m.source.type,
      credit: m.credit,
      styles: Boolean(r.forme),
      fix: r.fix,
      check: r.check,
    })
  }
  // Ordre de selection.json, catégories comprises
  const motifs = selection.motifs.map(m => byId.get(m.id)).filter(Boolean)
  const index = {
    version: selection.version,
    generatedAt: new Date().toISOString().slice(0, 10),
    reference: 'Contrôle au format M (motif de 27 cm, ponts de 3 mm) et S (18 cm, 2,5 mm)',
    categories: selection.categories,
    motifs,
  }
  fs.writeFileSync(indexFile, JSON.stringify(index))
  console.log(`${results.length - rejected} motifs écrits, ${rejected} refusés → ${path.relative(ROOT, OUT)}`)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
