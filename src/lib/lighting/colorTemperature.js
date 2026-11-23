// Couleur d'un blanc à partir de sa température (kelvins), pour l'aperçu du halo.
// Approximation du rayonnement du corps noir (Tanner Helland), valable de 1 000 à 40 000 K.

const clamp255 = v => Math.max(0, Math.min(255, Math.round(v)))
const hex2 = v => clamp255(v).toString(16).padStart(2, '0')

export function kelvinToRgb(kelvin) {
  const t = Math.max(1000, Math.min(40000, kelvin)) / 100
  const r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592)
  const g = t <= 66
    ? 99.4708025861 * Math.log(t) - 161.1195681661
    : 288.1221695283 * Math.pow(t - 60, -0.0755148492)
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307
  return [clamp255(r), clamp255(g), clamp255(b)]
}

export function kelvinToHex(kelvin) {
  const [r, g, b] = kelvinToRgb(kelvin)
  return `#${hex2(r)}${hex2(g)}${hex2(b)}`
}

// Couleur moyenne de plusieurs couleurs hexadécimales (teinte dominante d'un dégradé)
export function mixHex(colors) {
  const list = colors.filter(c => /^#[0-9a-f]{6}$/i.test(c))
  if (!list.length) return '#ffffff'
  const sum = [0, 0, 0]
  for (const c of list) for (let i = 0; i < 3; i++) sum[i] += parseInt(c.slice(1 + 2 * i, 3 + 2 * i), 16)
  return `#${sum.map(v => hex2(v / list.length)).join('')}`
}
