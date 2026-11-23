import{useState}from'react'
import ARViewer from'./ARViewer'
import GiftWizard from'./GiftWizard'

export default function StudioActions(){
  const[showAR,setShowAR]=useState(false)
  const[showGift,setShowGift]=useState(false)
  return(
    <>
      <div className="flex gap-2">
        <button onClick={()=>setShowGift(true)} className="flex flex-shrink-0 items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-slate-700 hover:border-slate-500 text-slate-300 rounded-full text-xs whitespace-nowrap transition-colors">🎁 Cadeau</button>
        <button onClick={()=>setShowAR(true)} className="flex flex-shrink-0 items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-slate-700 hover:border-slate-500 text-slate-300 rounded-full text-xs whitespace-nowrap transition-colors">📱 Voir sur mur</button>
      </div>
      <ARViewer show={showAR} onClose={()=>setShowAR(false)}/>
      <GiftWizard show={showGift} onClose={()=>setShowGift(false)}/>
    </>
  )
}
