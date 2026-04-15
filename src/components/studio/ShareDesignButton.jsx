import{useState}from'react'
import{motion,AnimatePresence}from'framer-motion'
import{useConfiguratorStore}from'../../store/configuratorStore'
import{useSavedDesignsStore}from'../../store/savedDesignsStore'
import{buildShareUrl}from'../../lib/designSerializer'

export default function ShareDesignButton(){
  const state=useConfiguratorStore()
  const{saveDesign,designs,deleteDesign,loadDesign}=useSavedDesignsStore()
  const[toast,setToast]=useState(null)
  const[show,setShow]=useState(false)

  const flash=msg=>{setToast(msg);setTimeout(()=>setToast(null),3000)}

  const handleShare=async()=>{
    const url=buildShareUrl(state)
    if(!url)return flash('Erreur')
    try{await navigator.clipboard.writeText(url);flash('✓ Lien copié !')}
    catch{flash('Lien : '+url)}
  }

  const handleSave=()=>{saveDesign(state);flash('✓ Design sauvegardé !')}

  const handleLoad=(id)=>{
    const data=loadDesign(id)
    if(!data)return
    if(data.motifId)state.setMotifId(data.motifId)
    if(data.sizePreset&&data.width&&data.height)state.setSizePreset(data.sizePreset,data.width,data.height)
    if(data.material)state.setMaterial(data.material)
    if(data.ledColor)state.setLedColor(data.ledColor)
    if(data.showText!==undefined)state.setShowText(data.showText)
    if(data.textContent)state.setTextContent(data.textContent)
    state.setMotifTransform({motifScale:data.motifScale??90,motifX:data.motifX??0,motifY:data.motifY??0,motifRotation:data.motifRotation??0,motifMirrorH:data.motifMirrorH??false,motifMirrorV:data.motifMirrorV??false})
    setShow(false);flash('✓ Design chargé !')
  }

  return(
    <div className="relative">
      <div className="flex gap-2">
        <button onClick={handleSave} className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded-lg transition-colors font-medium">💾 Sauvegarder</button>
        <button onClick={handleShare} className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded-lg transition-colors font-medium">🔗 Partager</button>
      </div>
      {designs.length>0&&(
        <button onClick={()=>setShow(!show)} className="w-full mt-2 py-1.5 text-xs text-slate-500 hover:text-amber-400 transition-colors">
          Mes designs ({designs.length}) {show?'▲':'▼'}
        </button>
      )}
      <AnimatePresence>
        {show&&(
          <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} className="overflow-hidden">
            <div className="flex flex-col gap-1 mt-2 max-h-48 overflow-y-auto">
              {designs.map(d=>(
                <div key={d.id} className="flex items-center gap-2 bg-slate-800 rounded-lg p-2">
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{background:d.preview.ledColor||'#ffb347',boxShadow:`0 0 4px ${d.preview.ledColor||'#ffb347'}`}}/>
                  <button onClick={()=>handleLoad(d.id)} className="flex-1 text-left text-xs text-slate-300 hover:text-amber-400 truncate">{d.name}</button>
                  <button onClick={()=>deleteDesign(d.id)} className="text-slate-600 hover:text-red-400 text-xs">×</button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {toast&&(
          <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-700 text-white text-sm px-4 py-2.5 rounded-full shadow-xl z-50 whitespace-nowrap">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
