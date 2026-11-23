// Regroupe le code partagé site / serveur (prix, formats, éclairage, livraison…) en un seul fichier
// lisible par les fonctions Supabase (Deno) : supabase/functions/_shared/lumicut.js.
//   node scripts/build-server-shared.mjs          → régénère le fichier
//   node scripts/build-server-shared.mjs --check  → vérifie qu'il est à jour (lancé avant chaque build du site)
// esbuild est installé avec Vite : aucune dépendance de plus.
import { build } from 'esbuild'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const entry = `${root}src/lib/serverShared.js`
const outfile = `${root}supabase/functions/_shared/lumicut.js`
const banner = [
  '// Fichier généré par scripts/build-server-shared.mjs à partir de src/lib : ne pas modifier à la main.',
  '// Après un changement de prix, de format, de matériau, d\'éclairage ou de livraison :',
  '// « npm run build:server », puis redéployer les fonctions qui l\'utilisent (create-order, ai-advisor).',
].join('\n')

const result = await build({
  entryPoints: [entry],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2020',
  write: false,
  legalComments: 'none',
  banner: { js: banner },
  logLevel: 'warning',
})
const code = result.outputFiles[0].text

if (process.argv.includes('--check')) {
  const current = await readFile(outfile, 'utf8').catch(() => '')
  if (current !== code) {
    console.error('supabase/functions/_shared/lumicut.js n\'est plus à jour : lancez « npm run build:server »')
    console.error('puis redéployez les fonctions serveur (create-order, ai-advisor).')
    process.exit(1)
  }
  console.log('Code partagé serveur à jour.')
} else {
  await writeFile(outfile, code)
  console.log(`Écrit : supabase/functions/_shared/lumicut.js (${Math.round(code.length / 1024)} Ko)`)
}
