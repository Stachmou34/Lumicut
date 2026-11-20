// Export SQL de la bibliothèque vers la table « motifs » de Supabase (identifiants « lib:<id> »).
// Usage : node scripts/library/to-sql.mjs > supabase/seed-library.sql
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const DIR = path.join(ROOT, 'public', 'library')
const index = JSON.parse(fs.readFileSync(path.join(DIR, 'index.json'), 'utf8'))
const q = v => (v == null ? 'null' : `'${String(v).replace(/'/g, "''")}'`)
const arr = list => `array[${list.map(q).join(',')}]::text[]`

console.log('-- Bibliothèque de motifs réels LumiCut, générée par scripts/library/to-sql.mjs')
console.log(`-- ${index.motifs.length} motifs, version du ${index.generatedAt}`)
for (const m of index.motifs) {
  const svg = fs.readFileSync(path.join(DIR, 'svg', `${m.id}.svg`), 'utf8')
  const c = m.credit
  console.log(`insert into motifs (id, name, category, svg_content, source, author, license, license_url, source_url, tags, active)
values (${q(`lib:${m.id}`)}, ${q(m.name)}, ${q(m.category)}, ${q(svg)}, 'library', ${q(c.author)}, ${q(c.license)}, ${q(c.licenseUrl)}, ${q(c.url)}, ${arr(m.tags)}, true)
on conflict (id) do update set name = excluded.name, category = excluded.category, svg_content = excluded.svg_content,
  author = excluded.author, license = excluded.license, license_url = excluded.license_url, source_url = excluded.source_url, tags = excluded.tags;`)
}
