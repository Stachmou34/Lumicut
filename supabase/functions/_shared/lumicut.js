// Fichier généré par scripts/build-server-shared.mjs à partir de src/lib : ne pas modifier à la main.
// Après un changement de prix, de format, de matériau, d'éclairage ou de livraison :
// « npm run build:server », puis redéployer les fonctions qui l'utilisent (create-order, ai-advisor).

// src/lib/lighting/colorTemperature.js
var clamp255 = (v) => Math.max(0, Math.min(255, Math.round(v)));
var hex2 = (v) => clamp255(v).toString(16).padStart(2, "0");
function kelvinToRgb(kelvin) {
  const t = Math.max(1e3, Math.min(4e4, kelvin)) / 100;
  const r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
  const g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  return [clamp255(r), clamp255(g), clamp255(b)];
}
function kelvinToHex(kelvin) {
  const [r, g, b] = kelvinToRgb(kelvin);
  return `#${hex2(r)}${hex2(g)}${hex2(b)}`;
}
function mixHex(colors) {
  const list = colors.filter((c) => /^#[0-9a-f]{6}$/i.test(c));
  if (!list.length) return "#ffffff";
  const sum = [0, 0, 0];
  for (const c of list) for (let i = 0; i < 3; i++) sum[i] += parseInt(c.slice(1 + 2 * i, 3 + 2 * i), 16);
  return `#${sum.map((v) => hex2(v / list.length)).join("")}`;
}

// src/lib/lighting/lightingCatalog.js
var LED_INSET_CM = 3;
var INSET_RANGE_CM = [2, 4];
var STANDARD_WHITES = [
  { id: "warm", label: "Blanc chaud", kelvin: 2700 },
  { id: "neutral", label: "Blanc neutre", kelvin: 4e3 },
  { id: "cold", label: "Blanc froid", kelvin: 6500 }
];
var HUE_WHITE_RANGE = [2200, 6500];
var COLOR_PRESETS = [
  { id: "violet", label: "Violet ambiance", color: "#bf7fff" },
  { id: "red", label: "Rouge passion", color: "#ff4444" },
  { id: "green", label: "Vert nature", color: "#44ff88" },
  { id: "blue", label: "Bleu \xE9lectrique", color: "#4488ff" },
  { id: "orange", label: "Orange sunset", color: "#ff8844" }
];
var GRADIENT_PRESETS = [
  { id: "coucher-de-soleil", label: "Coucher de soleil", colors: ["#ff7a2f", "#ff3d6e", "#8f3dff"] },
  { id: "aurore", label: "Aurore bor\xE9ale", colors: ["#2bff9e", "#22c8ff", "#7d4dff"] },
  { id: "ocean", label: "Oc\xE9an", colors: ["#1747ff", "#0fb5d6", "#6dffe0"] },
  { id: "braise", label: "Braise", colors: ["#ff2400", "#ff7a00", "#ffc400"] }
];
var LIGHT_MODELS = [
  {
    id: "standard",
    hue: false,
    name: "LED blanche",
    tier: "Sans couleur",
    summary: "Ruban LED blanc, non connect\xE9, branch\xE9 sur secteur. La teinte du blanc est choisie \xE0 la commande."
  },
  {
    id: "hue-essential",
    hue: true,
    name: "Philips Hue Essential",
    productName: "Ruban LED Hue Essential",
    tier: "Entr\xE9e de gamme",
    summary: "Couleurs et d\xE9grad\xE9s. Pas de LED blanches d\xE9di\xE9es : les blancs sont moins fid\xE8les.",
    whiteLeds: false,
    cutStepCm: null,
    // découpable aux repères ; intervalle non publié par Philips
    extendable: false,
    lengths: [
      { m: 5, price: 59.99, lumens: null, ean: "8721103096388", priceSource: "philips-hue.com/fr-fr" },
      { m: 10, price: 99.99, lumens: null, ean: "8721103096487", priceSource: "prix de lancement europ\xE9en, \xE0 confirmer" }
    ]
  },
  {
    id: "hue-flux",
    hue: true,
    name: "Philips Hue Flux",
    productName: "Lightstrip LED Flux",
    tier: "Le classique",
    summary: "Couleurs, d\xE9grad\xE9s et vrais blancs (LED blanches d\xE9di\xE9es).",
    whiteLeds: true,
    cutStepCm: 16.6,
    extendable: true,
    lengths: [
      { m: 3, price: 79.99, lumens: 1200, watts: 12, ean: "8721103087812", priceSource: "philips-hue.com (Belgique), Boulanger" },
      { m: 4, price: 84.99, lumens: 1600, watts: 16, ean: null, priceSource: "prix de lancement europ\xE9en, \xE0 confirmer" },
      { m: 5, price: 99.99, lumens: 2e3, watts: 20, ean: null, priceSource: "prix de lancement europ\xE9en, \xE0 confirmer" }
    ]
  },
  {
    id: "hue-flux-ultra",
    hue: true,
    name: "Philips Hue Flux ultra-lumineux",
    productName: "Lightstrip LED ultra-lumineux Flux",
    tier: "Tr\xE8s lumineux",
    summary: "Le Flux en 2,4 fois plus lumineux : grands formats, plafond, pi\xE8ces claires.",
    whiteLeds: true,
    cutStepCm: null,
    // intervalle de coupe non publié
    extendable: null,
    lengths: [
      { m: 3, price: 99.99, lumens: 2900, watts: 29, ean: "8721103088314", priceSource: "philips-hue.com (Belgique)" },
      { m: 5, price: 159.99, lumens: 4800, watts: 48, ean: null, priceSource: "philips-hue.com/fr-fr" },
      { m: 10, price: 269.99, lumens: 6e3, watts: 60, ean: null, priceSource: "philips-hue.com/fr-fr, \xE0 confirmer" }
    ]
  },
  {
    id: "hue-omniglow",
    hue: true,
    name: "Philips Hue OmniGlow",
    productName: "Lightstrip OmniGlow (micro LED)",
    tier: "Haut de gamme",
    summary: "Lumi\xE8re continue, sans points visibles (micro LED) : couleurs, d\xE9grad\xE9s et blancs tr\xE8s doux.",
    whiteLeds: true,
    cutStepCm: 12.5,
    extendable: false,
    lengths: [
      { m: 3, price: 149.99, lumens: 2700, watts: 40, ean: null, priceSource: "philips-hue.com/fr-fr" },
      { m: 5, price: 199.99, lumens: 4500, watts: 60, ean: null, priceSource: "prix de lancement europ\xE9en, \xE0 confirmer" },
      { m: 10, price: 349.99, lumens: 4500, watts: 60, ean: null, priceSource: "prix de lancement europ\xE9en, \xE0 confirmer" }
    ]
  }
];
var DEFAULT_HUE_MODEL = "hue-flux";
function getLightModel(id) {
  return LIGHT_MODELS.find((m) => m.id === id) ?? LIGHT_MODELS[0];
}
var isHueModel = (id) => getLightModel(id).hue === true;
var round1 = (v) => Math.round(v * 10) / 10;
function stripRunCm(widthCm, heightCm, insetCm = LED_INSET_CM) {
  return Math.max(0, 2 * (widthCm - 2 * insetCm + (heightCm - 2 * insetCm)));
}
function lightingFor({ lightModel, width, height }) {
  const model = getLightModel(lightModel);
  const W = Number(width) || 60;
  const H = Number(height) || 30;
  const run = stripRunCm(W, H);
  if (!model.hue) {
    return { model, hue: false, price: 0, length: null, lengthM: null, runCm: round1(run), cutCm: round1(run), insetCm: LED_INSET_CM, lumens: null, label: model.name };
  }
  const length = model.lengths.find((l) => l.m * 100 >= run) ?? model.lengths[model.lengths.length - 1];
  const max = length.m * 100;
  let cutCm = Math.min(run, max);
  let insetCm = LED_INSET_CM;
  if (model.cutStepCm) {
    const s = model.cutStepCm;
    let best = null;
    for (let n = 1; n * s <= max + 1e-6; n++) {
      const inset = (2 * (W + H) - n * s) / 8;
      if (inset < INSET_RANGE_CM[0] || inset > INSET_RANGE_CM[1]) continue;
      if (!best || Math.abs(inset - LED_INSET_CM) < Math.abs(best.inset - LED_INSET_CM)) best = { n, inset };
    }
    if (best) {
      cutCm = best.n * s;
      insetCm = best.inset;
    } else {
      cutCm = Math.floor(Math.min(run, max) / s) * s;
    }
  }
  const lumens = length.lumens ? Math.round(length.lumens * cutCm / max / 10) * 10 : null;
  return {
    model,
    hue: true,
    price: length.price,
    length,
    lengthM: length.m,
    runCm: round1(run),
    cutCm: round1(cutCm),
    insetCm: round1(insetCm),
    lumens,
    tooShort: max < run,
    label: `${model.name} \xB7 ruban ${length.m} m`
  };
}
function lightingBom(state) {
  const l = lightingFor(state);
  const white = !l.hue ? STANDARD_WHITES.find((x) => x.kelvin === state.ledKelvin) ?? nearestStandardWhite(state.ledKelvin) : null;
  return {
    model: l.model.id,
    label: l.hue ? l.model.productName : `Ruban LED blanc ${white.kelvin} K`,
    brand: l.hue ? "Philips Hue" : null,
    lengthM: l.lengthM,
    ean: l.length?.ean ?? null,
    cutCm: l.cutCm,
    insetCm: l.insetCm,
    cutStepCm: l.model.cutStepCm ?? null,
    kelvin: white?.kelvin ?? null,
    price: l.price
  };
}
var WHITE_BY_ID = Object.fromEntries(STANDARD_WHITES.map((w) => [w.id, w]));
var HEX = /^#[0-9a-f]{6}$/i;
function nearestStandardWhite(kelvin) {
  const k = Number(kelvin) || 2700;
  return STANDARD_WHITES.reduce((a, b) => Math.abs(b.kelvin - k) < Math.abs(a.kelvin - k) ? b : a);
}
function normalizeLighting(data = {}) {
  const known = LIGHT_MODELS.some((m) => m.id === data.lightModel);
  const oldWhite = !data.ledPreset || data.ledPreset in WHITE_BY_ID || data.ledPreset === "kelvin";
  const lightModel = known ? data.lightModel : oldWhite ? "standard" : DEFAULT_HUE_MODEL;
  let ledMode = ["white", "color", "gradient"].includes(data.ledMode) ? data.ledMode : oldWhite ? "white" : "color";
  if (!isHueModel(lightModel)) ledMode = "white";
  const ledGradient = Array.isArray(data.ledGradient) && data.ledGradient.length >= 2 && data.ledGradient.every((c) => HEX.test(c)) ? data.ledGradient.slice(0, 3) : GRADIENT_PRESETS[0].colors;
  let ledKelvin = Number(data.ledKelvin) || WHITE_BY_ID[data.ledPreset]?.kelvin || 2700;
  let ledPreset = data.ledPreset ?? "warm";
  let ledColor = HEX.test(data.ledColor ?? "") ? data.ledColor : "#ffffff";
  if (ledMode === "white") {
    if (lightModel === "standard") {
      const w = nearestStandardWhite(ledKelvin);
      ledKelvin = w.kelvin;
      ledPreset = w.id;
    } else {
      ledKelvin = Math.min(HUE_WHITE_RANGE[1], Math.max(HUE_WHITE_RANGE[0], Math.round(ledKelvin / 100) * 100));
      ledPreset = STANDARD_WHITES.find((w) => w.kelvin === ledKelvin)?.id ?? "kelvin";
    }
    ledColor = kelvinToHex(ledKelvin);
  } else if (ledMode === "gradient") {
    ledColor = mixHex(ledGradient);
    const same = GRADIENT_PRESETS.find((g) => g.colors.join() === ledGradient.join().toLowerCase());
    ledPreset = same?.id ?? "gradient";
  } else {
    ledPreset = COLOR_PRESETS.find((p) => p.color === ledColor.toLowerCase())?.id ?? "custom";
  }
  return { lightModel, ledMode, ledKelvin, ledPreset, ledColor, ledGradient };
}

// src/lib/materials.js
var MATERIALS = [
  { id: "acrylic-black", label: "Acrylique noir mat", color: "#111", surcharge: 0, popular: true },
  { id: "acrylic-white", label: "Acrylique blanc", color: "#f0f0f0", surcharge: 0 },
  { id: "acrylic-smoked", label: "Acrylique fum\xE9", color: "#1a1a3a", surcharge: 10 },
  { id: "birch-plywood", label: "Contreplaqu\xE9 bouleau", color: "#c8a97a", surcharge: 5 },
  { id: "mdf-black", label: "MDF peint noir", color: "#1a1a1a", surcharge: 5 }
];

// src/lib/computePrice.js
var SIZE_BASE = {
  S: 59,
  M: 89,
  L: 129,
  XL: 189
};
var CUSTOM_MIN_PRICE = SIZE_BASE.S;
var OPTION_PRICES = {
  dimmer: 10,
  engraving: 5,
  giftWrap: 8
};
function computePrice(config) {
  const { sizePreset, width, height, material, dimmer, engraving, giftWrap } = config;
  const lighting = lightingFor(config);
  let base;
  if (sizePreset === "custom") {
    const area = width * height / (60 * 30);
    base = Math.max(CUSTOM_MIN_PRICE, Math.round(89 * area * 10) / 10);
  } else {
    base = SIZE_BASE[sizePreset] ?? 89;
  }
  const materialPrice = MATERIALS.find((m) => m.id === material)?.surcharge ?? 0;
  const options = {
    // Variateur filaire : ruban standard uniquement (un ruban Hue se règle dans l'application)
    dimmer: dimmer && !lighting.hue ? OPTION_PRICES.dimmer : 0,
    engraving: engraving?.trim() ? OPTION_PRICES.engraving : 0,
    giftWrap: giftWrap ? OPTION_PRICES.giftWrap : 0
  };
  const total = base + materialPrice + lighting.price + options.dimmer + options.engraving + options.giftWrap;
  return {
    base,
    material: materialPrice,
    lighting: lighting.price,
    options,
    total: Math.round(total * 100) / 100,
    freeShipping: total >= 89
  };
}

// src/lib/sizes.js
var SIZE_PRESETS = [
  { id: "S", width: 40, height: 20, hint: "Id\xE9al bureau" },
  { id: "M", width: 60, height: 30, hint: "Parfait salon" },
  { id: "L", width: 80, height: 40, hint: "Impact maximum" },
  { id: "XL", width: 120, height: 60, hint: "Format statement" }
];
var CUSTOM_LIMITS = { width: [20, 150], height: [10, 80] };
function getSizePreset(id) {
  return SIZE_PRESETS.find((p) => p.id === id) ?? null;
}

// src/lib/designSerializer.js
var DESIGN_KEYS = [
  "motifId",
  "motifScale",
  "motifX",
  "motifY",
  "motifRotation",
  "motifMirrorH",
  "motifMirrorV",
  "showText",
  "textContent",
  "textSecondary",
  "textFont",
  "textAlign",
  "textLetterSpacing",
  "textSize",
  "textPosition",
  "textX",
  "textY",
  "textRotation",
  "sizePreset",
  "width",
  "height",
  "material",
  "ledColor",
  "ledPreset",
  "dimmer",
  "mounting",
  "engraving",
  "giftWrap",
  "lightModel",
  "ledMode",
  "ledKelvin",
  "ledGradient",
  "placement",
  "ambiance",
  "standoffDepth",
  "powerCable",
  "generator",
  "generatorName",
  "cutStyle",
  "cutStyleParams"
];
function fromBase64(encoded) {
  const raw = atob(encoded);
  try {
    return decodeURIComponent(escape(raw));
  } catch {
    return raw;
  }
}
function deserializeDesign(encoded) {
  try {
    return JSON.parse(fromBase64(encoded.replace(/ /g, "+")));
  } catch {
    return null;
  }
}

// src/lib/shippingCalc.js
var BASE_RATES = { FR: 8, BE: 12, LU: 12, MC: 8, CH: 18 };
var FREE_SHIPPING_FR = 89;
var LARGE_FORMAT_CM = 80;
var LARGE_FORMAT_SUPPLEMENT = 5;
function calculateShipping(items, country, total) {
  if (country === "FR" && total >= FREE_SHIPPING_FR) return 0;
  const maxDim = Math.max(0, ...items.flatMap((i) => [
    i.config?.width ?? 0,
    i.config?.height ?? 0
  ]));
  const sizeSupplement = maxDim >= LARGE_FORMAT_CM ? LARGE_FORMAT_SUPPLEMENT : 0;
  return (BASE_RATES[country] ?? 20) + sizeSupplement;
}

// src/lib/orderPricing.js
var MAX_ITEMS = 10;
var MAX_QUANTITY = 10;
var VAT_RATE = 0.2;
var COUNTRIES = ["FR", "BE", "LU", "MC", "CH", "OTHER"];
var TEXT_LIMITS = { textContent: 30, textSecondary: 40, engraving: 60 };
var MAX_DESIGN_LENGTH = 6e4;
var OrderError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "OrderError";
  }
};
var round2 = (v) => Math.round(v * 100) / 100;
var within = (v, [min, max]) => Number.isFinite(v) && v >= min && v <= max;
function panelFromDesign(design) {
  if (typeof design === "string" && design.length > MAX_DESIGN_LENGTH) {
    throw new OrderError("Configuration du panneau trop volumineuse");
  }
  const data = typeof design === "string" ? deserializeDesign(design) : design;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new OrderError("Configuration du panneau illisible : ajoutez-le \xE0 nouveau depuis le studio");
  }
  let width;
  let height;
  const preset = getSizePreset(data.sizePreset);
  if (preset) {
    width = preset.width;
    height = preset.height;
  } else if (data.sizePreset === "custom") {
    width = Math.round(Number(data.width) * 10) / 10;
    height = Math.round(Number(data.height) * 10) / 10;
    if (!within(width, CUSTOM_LIMITS.width) || !within(height, CUSTOM_LIMITS.height)) {
      throw new OrderError(
        `Format sur mesure hors limites : de ${CUSTOM_LIMITS.width[0]} \xD7 ${CUSTOM_LIMITS.height[0]} cm \xE0 ${CUSTOM_LIMITS.width[1]} \xD7 ${CUSTOM_LIMITS.height[1]} cm`
      );
    }
  } else {
    throw new OrderError("Format de panneau inconnu");
  }
  if (!MATERIALS.some((m) => m.id === data.material)) throw new OrderError("Mat\xE9riau inconnu");
  for (const [key, max] of Object.entries(TEXT_LIMITS)) {
    if (data[key] != null && (typeof data[key] !== "string" || data[key].length > max)) {
      throw new OrderError(`Texte trop long (${max} caract\xE8res au maximum)`);
    }
  }
  const known = {};
  for (const key of DESIGN_KEYS) if (key in data) known[key] = data[key];
  return {
    ...known,
    sizePreset: preset ? preset.id : "custom",
    width,
    height,
    // Éclairage cohérent (même règle que le studio : couleur ou dégradé ⇒ ruban Philips Hue)
    ...normalizeLighting(data),
    dimmer: data.dimmer === true,
    giftWrap: data.giftWrap === true,
    engraving: typeof data.engraving === "string" ? data.engraving.trim() : ""
  };
}
function quoteOrder({ items, country }) {
  if (!Array.isArray(items) || items.length === 0) throw new OrderError("Votre panier est vide");
  if (items.length > MAX_ITEMS) throw new OrderError(`${MAX_ITEMS} panneaux au maximum par commande`);
  if (!COUNTRIES.includes(country)) throw new OrderError("Pays de livraison non desservi");
  const lines = items.map((item) => {
    const quantity = Number(item?.quantity ?? 1);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      throw new OrderError(`Quantit\xE9 invalide (de 1 \xE0 ${MAX_QUANTITY} par panneau)`);
    }
    const panel = panelFromDesign(item?.design);
    const unitPrice = computePrice(panel).total;
    return { panel, quantity, unitPrice, lineTotal: round2(unitPrice * quantity) };
  });
  const subtotal = round2(lines.reduce((sum, l) => sum + l.lineTotal, 0));
  const shipping = calculateShipping(
    lines.map((l) => ({ config: { width: l.panel.width, height: l.panel.height } })),
    country,
    subtotal
  );
  const total = round2(subtotal + shipping);
  return {
    lines,
    subtotal,
    shipping,
    total,
    totalCents: Math.round(total * 100),
    priceHt: round2(total / (1 + VAT_RATE))
  };
}
function workshopItem(line, motifName = null) {
  const { panel, quantity, unitPrice, lineTotal } = line;
  return {
    motifId: panel.motifId ?? null,
    motifName: typeof motifName === "string" ? motifName.slice(0, 120) : null,
    sizePreset: panel.sizePreset,
    width: panel.width,
    height: panel.height,
    material: panel.material,
    lightModel: panel.lightModel,
    lighting: lightingBom(panel),
    options: { dimmer: panel.dimmer, giftWrap: panel.giftWrap, engraving: panel.engraving || null },
    quantity,
    unitPrice,
    lineTotal,
    // Design complet tel qu'il a été vérifié et facturé (texte, positions, motif, style de découpe…)
    design: panel
  };
}

// src/lib/advisorPrompt.js
var LIGHTING_OPTIONS = LIGHT_MODELS.map((m) => `${m.id} (${m.name}${m.hue ? `, +${lightingFor({ lightModel: m.id, width: 60, height: 30 }).price.toFixed(2).replace(".", ",")} \u20AC en format M` : ", incluse, blanc seulement"})`).join(", ");
var ADVISOR_SYSTEM = `Tu es le conseiller LumiCut. Tu aides les clients \xE0 choisir le bon panneau d\xE9coratif r\xE9tro\xE9clair\xE9 pour leur int\xE9rieur. Tu poses des questions sur la pi\xE8ce, le style d\xE9co, l'occasion (cadeau, d\xE9co perso\u2026), et tu recommandes un format, un motif et une couleur LED pr\xE9cis. Sois chaleureux, concis, inspirant. Maximum 3-4 phrases par r\xE9ponse.

Options disponibles dans le configurateur :
- Tailles : S (40\xD720cm, 59\u20AC), M (60\xD730cm, 89\u20AC), L (80\xD740cm, 129\u20AC), XL (120\xD760cm, 189\u20AC)
- Motifs : arbre-de-vie (Arbre de Vie), mandala (Mandala), cerf (Cerf)
- Mat\xE9riaux : acrylic-black (Acrylique Noir), acrylic-white (Acrylique Blanc), acrylic-smoked (Acrylique Fum\xE9), birch-plywood (Contreplaqu\xE9 Bouleau), mdf-black (MDF Noir)
- \xC9clairage (lightModel) : ${LIGHTING_OPTIONS}. Avec Philips Hue, le client change couleurs et d\xE9grad\xE9s quand il veut dans l'application Hue.
- Teinte (ledPreset) : warm (Blanc chaud 2700 K), neutral (Blanc neutre 4000 K), cold (Blanc froid 6500 K) ; avec Philips Hue seulement : violet, red, green, blue, orange, ou les d\xE9grad\xE9s coucher-de-soleil, aurore, ocean, braise

Quand tu fais une recommandation pr\xE9cise, ajoute sur une ligne s\xE9par\xE9e exactement ce format (les IDs doivent correspondre \xE0 ceux list\xE9s ci-dessus) :
CONFIG:{"sizePreset":"M","material":"acrylic-black","motifId":"arbre-de-vie","lightModel":"standard","ledPreset":"warm"}`;
export {
  ADVISOR_SYSTEM,
  COUNTRIES,
  MAX_ITEMS,
  MAX_QUANTITY,
  OrderError,
  VAT_RATE,
  panelFromDesign,
  quoteOrder,
  workshopItem
};
