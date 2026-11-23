import { useNavigate } from 'react-router-dom'
import { useConfiguratorStore } from '../store/configuratorStore'
import { useCartStore } from '../store/cartStore'
import { computePrice } from './computePrice'
import { motifLabel } from './panelDesign'
import { serializeDesign } from './designSerializer'
import { lightingBom } from './lighting/lightingCatalog'

// Ajoute le panneau configuré au panier puis ouvre le panier
export function useAddToCart() {
  const addItem = useCartStore(s => s.addItem)
  const navigate = useNavigate()

  return () => {
    const config = useConfiguratorStore.getState()
    const { total } = computePrice(config)
    addItem(
      {
        motif: { id: config.motifId, name: motifLabel(config) },
        material: config.material,
        width: config.width,
        height: config.height,
        sizePreset: config.sizePreset,
        ledColor: config.ledColor,
        // Éclairage : modèle de ruban, longueur à acheter, coupe et retrait (nomenclature pour l'atelier)
        lighting: lightingBom(config),
        // Motif généré : graine + paramètres, de quoi le recréer à l'identique pour la découpe
        generator: config.motifId === 'generated' ? config.generator : null,
        // Design complet (texte, position, pose, fixation…) en attendant sa prise en compte dans la commande
        design: serializeDesign(config),
      },
      total,
      null
    )
    navigate('/cart')
  }
}
