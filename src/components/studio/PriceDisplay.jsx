import{useMemo}from'react'
import{motion,AnimatePresence}from'framer-motion'
import{computePrice}from'../../lib/computePrice'
import{useConfiguratorStore}from'../../store/configuratorStore'
import{useCartStore}from'../../store/cartStore'
import{useNavigate}from'react-router-dom'
import{motifs}from'../../motifs/index'
import DeliveryEstimate from'./DeliveryEstimate'
import UpsellBanner from'./UpsellBanner'
import ShareDesignButton from'./ShareDesignButton'

export default function PriceDisplay(){
  const config=useConfiguratorStore()
  const addItem=useCartStore(s=>s.addItem)
  const navigate=useNavigate()

  const{total,freeShipping}=useMemo(()=>computePrice(config),[
    config.sizePreset,config.width,config.height,config.material,config.dimmer,config.engraving,config.giftWrap
  ])

  const handleAdd=()=>{
    // Résoudre le nom du motif (bibliothèque ou motif personnalisé)
    const motifObj = motifs.find(m => m.id === config.motifId)
    const motif = motifObj ? { id: motifObj.id, name: motifObj.name } : { id: config.motifId, name: 'Motif personnalisé' }
    addItem(
      { motif, material: config.material, width: config.width, height: config.height, sizePreset: config.sizePreset, ledColor: config.ledColor },
      total,
      null
    )
    navigate('/cart')
  }

  return(
    <div className="flex flex-col gap-3">
      <UpsellBanner/>
      <div className="p-4 bg-slate-800 rounded-xl border border-slate-700 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-sm">Total</span>
          <AnimatePresence mode="wait">
            <motion.span key={total} initial={{y:-8,opacity:0}} animate={{y:0,opacity:1}} exit={{y:8,opacity:0}} className="text-2xl font-bold text-white">
              {total.toFixed(2)} €
            </motion.span>
          </AnimatePresence>
        </div>
        {freeShipping&&<div className="text-xs text-emerald-400">✓ Livraison offerte</div>}
        <DeliveryEstimate/>
        <button onClick={handleAdd} className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg transition-colors text-sm">
          Ajouter au panier →
        </button>
      </div>
      <ShareDesignButton/>
    </div>
  )
}
