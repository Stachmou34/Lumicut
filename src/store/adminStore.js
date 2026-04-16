import { create } from 'zustand'
import { supabase } from '../lib/supabaseClient'

// Mot de passe admin hardcodé pour V1 (à remplacer par Supabase Auth)
const ADMIN_PASSWORD = 'lumicut2024'

// Étiquettes et couleurs des statuts de commande
export const STATUS_CONFIG = {
  pending:       { label: 'En attente de paiement', badge: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' },
  paid:          { label: 'Payée — à produire',     badge: 'bg-blue-500/20 text-blue-300 border border-blue-500/30' },
  in_production: { label: 'En production',           badge: 'bg-orange-500/20 text-orange-300 border border-orange-500/30' },
  shipped:       { label: 'Expédiée',                badge: 'bg-purple-500/20 text-purple-300 border border-purple-500/30' },
  delivered:     { label: 'Livrée',                  badge: 'bg-green-500/20 text-green-300 border border-green-500/30' },
  cancelled:     { label: 'Annulée / remboursée',    badge: 'bg-red-500/20 text-red-300 border border-red-500/30' },
}

// Colonnes Kanban de production
export const KANBAN_COLUMNS = [
  { id: 'to_produce', label: 'À produire',          color: 'border-blue-500/40' },
  { id: 'cutting',    label: 'En cours de découpe', color: 'border-orange-500/40' },
  { id: 'assembly',   label: 'Assemblage LED',       color: 'border-yellow-500/40' },
  { id: 'ready',      label: 'Prête à expédier',    color: 'border-green-500/40' },
]

// Retourne le statut / production_stage correspondant à une colonne kanban
export function statusFromKanban(columnId) {
  switch (columnId) {
    case 'to_produce': return { status: 'paid',          production_stage: null }
    case 'cutting':    return { status: 'in_production', production_stage: 'cutting' }
    case 'assembly':   return { status: 'in_production', production_stage: 'assembly' }
    case 'ready':      return { status: 'in_production', production_stage: 'ready' }
    default:           return { status: 'shipped',       production_stage: null }
  }
}

// Retourne l'ID de colonne kanban correspondant à une commande
export function kanbanColumnOf(order) {
  if (order.status === 'paid') return 'to_produce'
  if (order.status === 'in_production') {
    if (order.production_stage === 'assembly') return 'assembly'
    if (order.production_stage === 'ready')    return 'ready'
    return 'cutting'
  }
  return null
}

// Libellés lisibles pour les matériaux
export const MATERIAL_LABELS = {
  'acrylic-black':  'Acrylique Noir',
  'acrylic-white':  'Acrylique Blanc',
  'acrylic-smoked': 'Acrylique Fumé',
  'birch-plywood':  'Contreplaqué Bouleau',
  'mdf-black':      'MDF Noir',
}

// Libellés lisibles pour les motifs
export const MOTIF_LABELS = {
  'arbre-de-vie': 'Arbre de Vie',
  'mandala':      'Mandala',
  'cerf':         'Cerf',
}

// ──────────────────────────────────────────
// Données mock — remplacées par Supabase
// ──────────────────────────────────────────
const MOCK_ORDERS = [
  {
    id: 'ORD-2026-001',
    created_at: '2026-04-16T10:30:00.000Z',
    customer_name: 'Sophie Laurent',
    customer_email: 'sophie.laurent@gmail.com',
    customer_address: { street: '14 rue du Rhône', city: 'Lyon', zip: '69002' },
    config: { size: 'L', material: 'acrylic-black', motif: 'arbre-de-vie', led: 'warm', dimmer: false, engraving: '' },
    price_ht: 107.50, price_ttc: 129,
    status: 'paid', production_stage: null,
    stripe_payment_id: 'pi_mock_001', notes: '',
    status_history: [
      { status: 'pending', timestamp: '2026-04-16T10:28:00.000Z' },
      { status: 'paid',    timestamp: '2026-04-16T10:30:00.000Z' },
    ],
  },
  {
    id: 'ORD-2026-002',
    created_at: '2026-04-16T14:20:00.000Z',
    customer_name: 'Thomas Renaud',
    customer_email: 'thomas.renaud@outlook.fr',
    customer_address: { street: '3 avenue de l\'Opéra', city: 'Paris', zip: '75001' },
    config: { size: 'M', material: 'acrylic-smoked', motif: 'mandala', led: 'cold', dimmer: true, engraving: 'T&M' },
    price_ht: 82.50, price_ttc: 99,
    status: 'paid', production_stage: null,
    stripe_payment_id: 'pi_mock_002', notes: 'Client VIP, soigné l\'emballage',
    status_history: [
      { status: 'pending', timestamp: '2026-04-16T14:18:00.000Z' },
      { status: 'paid',    timestamp: '2026-04-16T14:20:00.000Z' },
    ],
  },
  {
    id: 'ORD-2026-003',
    created_at: '2026-04-15T09:15:00.000Z',
    customer_name: 'Emma Bernard',
    customer_email: 'emma.bernard@gmail.com',
    customer_address: { street: '8 cours de l\'Intendance', city: 'Bordeaux', zip: '33000' },
    config: { size: 'S', material: 'acrylic-white', motif: 'cerf', led: 'warm', dimmer: false, engraving: '' },
    price_ht: 49.17, price_ttc: 59,
    status: 'in_production', production_stage: 'cutting',
    stripe_payment_id: 'pi_mock_003', notes: '',
    status_history: [
      { status: 'pending',       timestamp: '2026-04-15T09:12:00.000Z' },
      { status: 'paid',          timestamp: '2026-04-15T09:15:00.000Z' },
      { status: 'in_production', timestamp: '2026-04-15T14:00:00.000Z' },
    ],
  },
  {
    id: 'ORD-2026-004',
    created_at: '2026-04-14T16:45:00.000Z',
    customer_name: 'Lucas Moreau',
    customer_email: 'lucas.moreau@yahoo.fr',
    customer_address: { street: '22 rue Alsace-Lorraine', city: 'Toulouse', zip: '31000' },
    config: { size: 'XL', material: 'birch-plywood', motif: 'arbre-de-vie', led: 'rgb', dimmer: true, engraving: '' },
    price_ht: 162.50, price_ttc: 194,
    status: 'in_production', production_stage: 'assembly',
    stripe_payment_id: 'pi_mock_004', notes: '',
    status_history: [
      { status: 'pending',       timestamp: '2026-04-14T16:40:00.000Z' },
      { status: 'paid',          timestamp: '2026-04-14T16:45:00.000Z' },
      { status: 'in_production', timestamp: '2026-04-15T09:00:00.000Z' },
    ],
  },
  {
    id: 'ORD-2026-005',
    created_at: '2026-04-14T11:00:00.000Z',
    customer_name: 'Chloé Petit',
    customer_email: 'chloe.petit@gmail.com',
    customer_address: { street: '5 place Royale', city: 'Nantes', zip: '44000' },
    config: { size: 'M', material: 'acrylic-black', motif: 'mandala', led: 'warm', dimmer: false, engraving: 'Chloé' },
    price_ht: 77.50, price_ttc: 89,  // ajout gravure +5
    status: 'in_production', production_stage: 'ready',
    stripe_payment_id: 'pi_mock_005', notes: 'Prévoir livraison avant le 22 avril',
    status_history: [
      { status: 'pending',       timestamp: '2026-04-14T10:55:00.000Z' },
      { status: 'paid',          timestamp: '2026-04-14T11:00:00.000Z' },
      { status: 'in_production', timestamp: '2026-04-15T08:30:00.000Z' },
    ],
  },
  {
    id: 'ORD-2026-006',
    created_at: '2026-04-13T13:30:00.000Z',
    customer_name: 'Maxime Dubois',
    customer_email: 'maxime.dubois@hotmail.fr',
    customer_address: { street: '7 rue des Grandes Arcades', city: 'Strasbourg', zip: '67000' },
    config: { size: 'L', material: 'acrylic-black', motif: 'cerf', led: 'warm', dimmer: false, engraving: '' },
    price_ht: 107.50, price_ttc: 129,
    status: 'shipped', production_stage: null,
    stripe_payment_id: 'pi_mock_006', notes: '',
    status_history: [
      { status: 'pending',       timestamp: '2026-04-13T13:25:00.000Z' },
      { status: 'paid',          timestamp: '2026-04-13T13:30:00.000Z' },
      { status: 'in_production', timestamp: '2026-04-14T09:00:00.000Z' },
      { status: 'shipped',       timestamp: '2026-04-16T08:00:00.000Z' },
    ],
  },
  {
    id: 'ORD-2026-007',
    created_at: '2026-04-11T10:00:00.000Z',
    customer_name: 'Julie Martin',
    customer_email: 'julie.martin@gmail.com',
    customer_address: { street: '15 rue Paradis', city: 'Marseille', zip: '13001' },
    config: { size: 'S', material: 'mdf-black', motif: 'arbre-de-vie', led: 'cold', dimmer: false, engraving: '' },
    price_ht: 53.33, price_ttc: 64,
    status: 'delivered', production_stage: null,
    stripe_payment_id: 'pi_mock_007', notes: '',
    status_history: [
      { status: 'pending',       timestamp: '2026-04-11T09:55:00.000Z' },
      { status: 'paid',          timestamp: '2026-04-11T10:00:00.000Z' },
      { status: 'in_production', timestamp: '2026-04-12T09:00:00.000Z' },
      { status: 'shipped',       timestamp: '2026-04-14T10:00:00.000Z' },
      { status: 'delivered',     timestamp: '2026-04-16T14:00:00.000Z' },
    ],
  },
  {
    id: 'ORD-2026-008',
    created_at: '2026-04-09T15:20:00.000Z',
    customer_name: 'Pierre Lefebvre',
    customer_email: 'pierre.lefebvre@sfr.fr',
    customer_address: { street: '2 rue de la Monnaie', city: 'Rennes', zip: '35000' },
    config: { size: 'XL', material: 'acrylic-smoked', motif: 'mandala', led: 'warm', dimmer: true, engraving: '' },
    price_ht: 170.00, price_ttc: 204,
    status: 'delivered', production_stage: null,
    stripe_payment_id: 'pi_mock_008', notes: '',
    status_history: [
      { status: 'pending',       timestamp: '2026-04-09T15:15:00.000Z' },
      { status: 'paid',          timestamp: '2026-04-09T15:20:00.000Z' },
      { status: 'in_production', timestamp: '2026-04-10T09:00:00.000Z' },
      { status: 'shipped',       timestamp: '2026-04-12T11:00:00.000Z' },
      { status: 'delivered',     timestamp: '2026-04-14T16:00:00.000Z' },
    ],
  },
  {
    id: 'ORD-2026-009',
    created_at: '2026-04-09T09:45:00.000Z',
    customer_name: 'Camille Durand',
    customer_email: 'camille.durand@gmail.com',
    customer_address: { street: '11 rue Félix Viallet', city: 'Grenoble', zip: '38000' },
    config: { size: 'M', material: 'acrylic-black', motif: 'cerf', led: 'cold', dimmer: false, engraving: '' },
    price_ht: 74.17, price_ttc: 89,
    status: 'cancelled', production_stage: null,
    stripe_payment_id: 'pi_mock_009', notes: 'Remboursé le 10/04',
    status_history: [
      { status: 'pending',   timestamp: '2026-04-09T09:40:00.000Z' },
      { status: 'paid',      timestamp: '2026-04-09T09:45:00.000Z' },
      { status: 'cancelled', timestamp: '2026-04-10T10:00:00.000Z' },
    ],
  },
  {
    id: 'ORD-2026-010',
    created_at: '2026-04-06T11:30:00.000Z',
    customer_name: 'Antoine Simon',
    customer_email: 'antoine.simon@gmail.com',
    customer_address: { street: '18 rue Faidherbe', city: 'Lille', zip: '59000' },
    config: { size: 'L', material: 'birch-plywood', motif: 'arbre-de-vie', led: 'warm', dimmer: false, engraving: '' },
    price_ht: 111.67, price_ttc: 134,
    status: 'delivered', production_stage: null,
    stripe_payment_id: 'pi_mock_010', notes: '',
    status_history: [
      { status: 'pending',       timestamp: '2026-04-06T11:25:00.000Z' },
      { status: 'paid',          timestamp: '2026-04-06T11:30:00.000Z' },
      { status: 'in_production', timestamp: '2026-04-07T09:00:00.000Z' },
      { status: 'shipped',       timestamp: '2026-04-09T10:00:00.000Z' },
      { status: 'delivered',     timestamp: '2026-04-11T15:00:00.000Z' },
    ],
  },
  {
    id: 'ORD-2026-011',
    created_at: '2026-04-04T14:00:00.000Z',
    customer_name: 'Léa Fontaine',
    customer_email: 'lea.fontaine@gmail.com',
    customer_address: { street: '6 avenue de Verdun', city: 'Nice', zip: '06000' },
    config: { size: 'S', material: 'acrylic-white', motif: 'mandala', led: 'cold', dimmer: false, engraving: '' },
    price_ht: 49.17, price_ttc: 59,
    status: 'delivered', production_stage: null,
    stripe_payment_id: 'pi_mock_011', notes: '',
    status_history: [
      { status: 'pending',       timestamp: '2026-04-04T13:55:00.000Z' },
      { status: 'paid',          timestamp: '2026-04-04T14:00:00.000Z' },
      { status: 'in_production', timestamp: '2026-04-05T09:00:00.000Z' },
      { status: 'shipped',       timestamp: '2026-04-07T11:00:00.000Z' },
      { status: 'delivered',     timestamp: '2026-04-09T14:00:00.000Z' },
    ],
  },
  {
    id: 'ORD-2026-012',
    created_at: '2026-04-02T10:15:00.000Z',
    customer_name: 'Hugo Leroy',
    customer_email: 'hugo.leroy@hotmail.fr',
    customer_address: { street: '9 rue de la Loge', city: 'Montpellier', zip: '34000' },
    config: { size: 'M', material: 'acrylic-smoked', motif: 'cerf', led: 'warm', dimmer: false, engraving: '' },
    price_ht: 82.50, price_ttc: 99,
    status: 'delivered', production_stage: null,
    stripe_payment_id: 'pi_mock_012', notes: '',
    status_history: [
      { status: 'pending',       timestamp: '2026-04-02T10:10:00.000Z' },
      { status: 'paid',          timestamp: '2026-04-02T10:15:00.000Z' },
      { status: 'in_production', timestamp: '2026-04-03T09:00:00.000Z' },
      { status: 'shipped',       timestamp: '2026-04-05T10:00:00.000Z' },
      { status: 'delivered',     timestamp: '2026-04-07T15:00:00.000Z' },
    ],
  },
  {
    id: 'ORD-2026-013',
    created_at: '2026-04-01T16:30:00.000Z',
    customer_name: 'Manon Blanc',
    customer_email: 'manon.blanc@gmail.com',
    customer_address: { street: '4 place Plumereau', city: 'Tours', zip: '37000' },
    config: { size: 'XL', material: 'acrylic-black', motif: 'arbre-de-vie', led: 'rgb', dimmer: false, engraving: '' },
    price_ht: 170.00, price_ttc: 204,
    status: 'delivered', production_stage: null,
    stripe_payment_id: 'pi_mock_013', notes: '',
    status_history: [
      { status: 'pending',       timestamp: '2026-04-01T16:25:00.000Z' },
      { status: 'paid',          timestamp: '2026-04-01T16:30:00.000Z' },
      { status: 'in_production', timestamp: '2026-04-02T09:00:00.000Z' },
      { status: 'shipped',       timestamp: '2026-04-04T11:00:00.000Z' },
      { status: 'delivered',     timestamp: '2026-04-07T10:00:00.000Z' },
    ],
  },
  {
    id: 'ORD-2026-014',
    created_at: '2026-03-30T09:00:00.000Z',
    customer_name: 'Nathan Gauthier',
    customer_email: 'nathan.gauthier@sfr.fr',
    customer_address: { street: '12 rue de la Liberté', city: 'Dijon', zip: '21000' },
    config: { size: 'L', material: 'mdf-black', motif: 'mandala', led: 'warm', dimmer: false, engraving: '' },
    price_ht: 111.67, price_ttc: 134,
    status: 'delivered', production_stage: null,
    stripe_payment_id: 'pi_mock_014', notes: '',
    status_history: [
      { status: 'pending',       timestamp: '2026-03-30T08:55:00.000Z' },
      { status: 'paid',          timestamp: '2026-03-30T09:00:00.000Z' },
      { status: 'in_production', timestamp: '2026-03-31T09:00:00.000Z' },
      { status: 'shipped',       timestamp: '2026-04-02T10:00:00.000Z' },
      { status: 'delivered',     timestamp: '2026-04-04T15:00:00.000Z' },
    ],
  },
  {
    id: 'ORD-2026-015',
    created_at: '2026-03-28T11:45:00.000Z',
    customer_name: 'Alice Roux',
    customer_email: 'alice.roux@gmail.com',
    customer_address: { street: '7 rue Saint-Jean', city: 'Caen', zip: '14000' },
    config: { size: 'S', material: 'acrylic-black', motif: 'cerf', led: 'cold', dimmer: false, engraving: '' },
    price_ht: 49.17, price_ttc: 59,
    status: 'delivered', production_stage: null,
    stripe_payment_id: 'pi_mock_015', notes: '',
    status_history: [
      { status: 'pending',       timestamp: '2026-03-28T11:40:00.000Z' },
      { status: 'paid',          timestamp: '2026-03-28T11:45:00.000Z' },
      { status: 'in_production', timestamp: '2026-03-29T09:00:00.000Z' },
      { status: 'shipped',       timestamp: '2026-03-31T10:00:00.000Z' },
      { status: 'delivered',     timestamp: '2026-04-02T14:00:00.000Z' },
    ],
  },
  {
    id: 'ORD-2026-016',
    created_at: '2026-03-26T14:20:00.000Z',
    customer_name: 'Louis Bonnet',
    customer_email: 'louis.bonnet@gmail.com',
    customer_address: { street: '3 rue des Jacobins', city: 'Amiens', zip: '80000' },
    config: { size: 'M', material: 'birch-plywood', motif: 'arbre-de-vie', led: 'warm', dimmer: false, engraving: '' },
    price_ht: 78.33, price_ttc: 94,
    status: 'delivered', production_stage: null,
    stripe_payment_id: 'pi_mock_016', notes: '',
    status_history: [
      { status: 'pending',       timestamp: '2026-03-26T14:15:00.000Z' },
      { status: 'paid',          timestamp: '2026-03-26T14:20:00.000Z' },
      { status: 'in_production', timestamp: '2026-03-27T09:00:00.000Z' },
      { status: 'shipped',       timestamp: '2026-03-29T10:00:00.000Z' },
      { status: 'delivered',     timestamp: '2026-04-01T16:00:00.000Z' },
    ],
  },
  {
    id: 'ORD-2026-017',
    created_at: '2026-03-24T10:30:00.000Z',
    customer_name: 'Inès Perrin',
    customer_email: 'ines.perrin@yahoo.fr',
    customer_address: { street: '20 place de Jaude', city: 'Clermont-Ferrand', zip: '63000' },
    config: { size: 'L', material: 'acrylic-black', motif: 'mandala', led: 'cold', dimmer: false, engraving: '' },
    price_ht: 107.50, price_ttc: 129,
    status: 'delivered', production_stage: null,
    stripe_payment_id: 'pi_mock_017', notes: '',
    status_history: [
      { status: 'pending',       timestamp: '2026-03-24T10:25:00.000Z' },
      { status: 'paid',          timestamp: '2026-03-24T10:30:00.000Z' },
      { status: 'in_production', timestamp: '2026-03-25T09:00:00.000Z' },
      { status: 'shipped',       timestamp: '2026-03-27T11:00:00.000Z' },
      { status: 'delivered',     timestamp: '2026-03-30T15:00:00.000Z' },
    ],
  },
  {
    id: 'ORD-2026-018',
    created_at: '2026-03-22T13:15:00.000Z',
    customer_name: 'Alexis Michaud',
    customer_email: 'alexis.michaud@gmail.com',
    customer_address: { street: '1 rue de Siam', city: 'Brest', zip: '29200' },
    config: { size: 'XL', material: 'acrylic-smoked', motif: 'cerf', led: 'rgb', dimmer: true, engraving: '' },
    price_ht: 182.50, price_ttc: 219,
    status: 'delivered', production_stage: null,
    stripe_payment_id: 'pi_mock_018', notes: '',
    status_history: [
      { status: 'pending',       timestamp: '2026-03-22T13:10:00.000Z' },
      { status: 'paid',          timestamp: '2026-03-22T13:15:00.000Z' },
      { status: 'in_production', timestamp: '2026-03-23T09:00:00.000Z' },
      { status: 'shipped',       timestamp: '2026-03-25T10:00:00.000Z' },
      { status: 'delivered',     timestamp: '2026-03-28T14:00:00.000Z' },
    ],
  },
  {
    id: 'ORD-2026-019',
    created_at: '2026-03-20T09:45:00.000Z',
    customer_name: 'Yasmine Fournier',
    customer_email: 'yasmine.fournier@sfr.fr',
    customer_address: { street: '8 rue du Gros-Horloge', city: 'Rouen', zip: '76000' },
    config: { size: 'M', material: 'acrylic-black', motif: 'arbre-de-vie', led: 'warm', dimmer: false, engraving: '' },
    price_ht: 74.17, price_ttc: 89,
    status: 'delivered', production_stage: null,
    stripe_payment_id: 'pi_mock_019', notes: '',
    status_history: [
      { status: 'pending',       timestamp: '2026-03-20T09:40:00.000Z' },
      { status: 'paid',          timestamp: '2026-03-20T09:45:00.000Z' },
      { status: 'in_production', timestamp: '2026-03-21T09:00:00.000Z' },
      { status: 'shipped',       timestamp: '2026-03-23T10:00:00.000Z' },
      { status: 'delivered',     timestamp: '2026-03-25T15:00:00.000Z' },
    ],
  },
  {
    id: 'ORD-2026-020',
    created_at: '2026-03-18T15:00:00.000Z',
    customer_name: 'Raphaël Lambert',
    customer_email: 'raphael.lambert@hotmail.fr',
    customer_address: { street: '16 cours de l\'Argonne', city: 'Bordeaux', zip: '33000' },
    config: { size: 'S', material: 'mdf-black', motif: 'mandala', led: 'cold', dimmer: false, engraving: '' },
    price_ht: 53.33, price_ttc: 64,
    status: 'delivered', production_stage: null,
    stripe_payment_id: 'pi_mock_020', notes: '',
    status_history: [
      { status: 'pending',       timestamp: '2026-03-18T14:55:00.000Z' },
      { status: 'paid',          timestamp: '2026-03-18T15:00:00.000Z' },
      { status: 'in_production', timestamp: '2026-03-19T09:00:00.000Z' },
      { status: 'shipped',       timestamp: '2026-03-21T11:00:00.000Z' },
      { status: 'delivered',     timestamp: '2026-03-24T14:00:00.000Z' },
    ],
  },
]

// ──────────────────────────────────────────
// Store Zustand
// ──────────────────────────────────────────
export const useAdminStore = create((set, get) => ({
  // ── Authentification ──
  isAuthenticated: localStorage.getItem('lumicut_admin_auth') === 'true',

  login: (password) => {
    if (password === ADMIN_PASSWORD) {
      localStorage.setItem('lumicut_admin_auth', 'true')
      set({ isAuthenticated: true })
      return true
    }
    return false
  },

  logout: () => {
    localStorage.removeItem('lumicut_admin_auth')
    set({ isAuthenticated: false })
  },

  // ── Commandes ──
  orders: MOCK_ORDERS,
  isLoading: false,
  loadError: null,

  // Charge les commandes depuis Supabase (fallback sur mock si non configuré)
  loadOrders: async () => {
    if (!supabase) return // garde les données mock
    set({ isLoading: true, loadError: null })
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erreur chargement commandes:', error)
      set({ isLoading: false, loadError: error.message })
      return
    }
    // Remplace les mocks uniquement si Supabase contient des données
    if (data && data.length > 0) {
      set({ orders: data, isLoading: false })
    } else {
      set({ isLoading: false })
    }
  },

  updateOrderStatus: async (id, status, productionStage = undefined) => {
    // Mise à jour locale optimiste
    set(state => ({
      orders: state.orders.map(order => {
        if (order.id !== id) return order
        const newEntry = { status, timestamp: new Date().toISOString() }
        return {
          ...order,
          status,
          production_stage: productionStage !== undefined ? productionStage : order.production_stage,
          status_history: [...(order.status_history ?? []), newEntry],
        }
      }),
    }))

    // Sync Supabase
    if (supabase) {
      const order = get().orders.find(o => o.id === id)
      await supabase.from('orders').update({
        status,
        production_stage: productionStage !== undefined ? productionStage : order?.production_stage,
        status_history: order?.status_history ?? [],
      }).eq('id', id)
    }
  },

  updateOrderNotes: async (id, notes) => {
    // Mise à jour locale optimiste
    set(state => ({
      orders: state.orders.map(o => o.id === id ? { ...o, notes } : o),
    }))

    // Sync Supabase
    if (supabase) {
      await supabase.from('orders').update({ notes }).eq('id', id)
    }
  },

  // ── Kanban : déplacement d'une commande entre colonnes ──
  moveOrderToKanbanColumn: (orderId, columnId) => {
    const { status, production_stage } = statusFromKanban(columnId)
    get().updateOrderStatus(orderId, status, production_stage)
  },
}))
