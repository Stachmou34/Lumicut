import{useState}from'react'
import{AnimatePresence,motion}from'framer-motion'
import{useConfiguratorStore}from'../../store/configuratorStore'

const RULES=[
  {id:'size',condition:s=>s.sizePreset==='S'||s.sizePreset==='M',message:s=>s.sizePreset==='S'?'💡 Passez au format M (+30€) pour un impact 3× plus grand.':'✨ Le format L est le plus commandé — impact maximum.',cta:'Voir L',action:'upgrade'},
  {id:'dimmer',condition:s=>!s.dimmer,message:()=>'🎚️ Ajoutez un variateur de luminosité (+10€) pour changer d\'ambiance.',cta:'Ajouter',action:'dimmer'},
  {id:'gift',condition:s=>!s.giftWrap,message:()=>'🎁 Pour un cadeau ? Emballage luxe disponible pour seulement +8€.',cta:'Ajouter',action:'gift'},
]

export default function UpsellBanner(){
  const state=useConfiguratorStore()
  const{setSizePreset,toggleDimmer,toggleGiftWrap}=state
  const[dismissed,setDismissed]=useState(new Set())

  const active=RULES.find(r=>!dismissed.has(r.id)&&r.condition(state))
  if(!active)return null

  const handleCTA=()=>{
    if(active.action==='upgrade')setSizePreset('L',80,40)
    if(active.action==='dimmer')toggleDimmer()
    if(active.action==='gift')toggleGiftWrap()
    setDismissed(p=>new Set([...p,active.id]))
  }

  return(
    <AnimatePresence>
      <motion.div key={active.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
        className="relative bg-gradient-to-r from-amber-900/30 to-slate-800 border border-amber-700/40 rounded-xl p-3 text-xs">
        <button onClick={()=>setDismissed(p=>new Set([...p,active.id]))} className="absolute top-2 right-2 text-slate-600 hover:text-slate-400">×</button>
        <p className="text-slate-300 pr-4 leading-relaxed mb-2">{active.message(state)}</p>
        <button onClick={handleCTA} className="text-amber-400 hover:text-amber-300 font-semibold">{active.cta} →</button>
      </motion.div>
    </AnimatePresence>
  )
}
