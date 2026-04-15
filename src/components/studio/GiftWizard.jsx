import{useState}from'react'
import{motion,AnimatePresence}from'framer-motion'
import{useConfiguratorStore}from'../../store/configuratorStore'

const STEPS=[
  {id:'recipient',question:'Pour qui est ce cadeau ?',options:[{value:'enfant',label:'Enfant',emoji:'👶'},{value:'adulte',label:'Adulte',emoji:'🧑'},{value:'couple',label:'Couple',emoji:'💑'},{value:'entreprise',label:'Entreprise',emoji:'🏢'}]},
  {id:'occasion',question:'Quelle occasion ?',options:[{value:'anniversaire',label:'Anniversaire',emoji:'🎂'},{value:'mariage',label:'Mariage',emoji:'💍'},{value:'naissance',label:'Naissance',emoji:'🍼'},{value:'noel',label:'Noël',emoji:'🎄'},{value:'fete-meres',label:'Fête des mères',emoji:'💐'},{value:'other',label:'Sans occasion',emoji:'🎁'}]},
  {id:'style',question:'Quel style ?',options:[{value:'minimaliste',label:'Minimaliste',emoji:'◻️'},{value:'nature',label:'Nature',emoji:'🌿'},{value:'romantique',label:'Romantique',emoji:'🌹'},{value:'moderne',label:'Moderne',emoji:'⚡'},{value:'personnalise',label:'Prénom/Texte',emoji:'✍️'}]},
]

function getRec(ans){
  const{recipient,occasion,style}=ans
  let motifId='arbre-de-vie'
  if(style==='minimaliste'||style==='moderne')motifId='mandala'
  else if(recipient==='enfant')motifId='cerf'
  let sizePreset='M',w=60,h=30
  if(recipient==='entreprise'){sizePreset='L';w=80;h=40}
  let textFont='Inter'
  if(style==='romantique'||occasion==='mariage')textFont='Dancing Script'
  if(occasion==='naissance')textFont='Nunito'
  return{motifId,sizePreset,w,h,textFont}
}

export default function GiftWizard({show,onClose}){
  const[step,setStep]=useState(0)
  const[answers,setAnswers]=useState({})
  const{setMotifId,setSizePreset,setTextFont,setShowText,toggleGiftWrap}=useConfiguratorStore()

  const handleAnswer=(value)=>{
    const na={...answers,[STEPS[step].id]:value}
    setAnswers(na)
    if(step<STEPS.length-1){setStep(step+1)}
    else{
      const r=getRec(na)
      setMotifId(r.motifId)
      setSizePreset(r.sizePreset,r.w,r.h)
      setTextFont(r.textFont)
      if(na.style==='personnalise')setShowText(true)
      toggleGiftWrap()
      onClose()
    }
  }

  const cur=STEPS[step]
  return(
    <AnimatePresence>
      {show&&(
        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6" onClick={onClose}>
          <motion.div initial={{scale:0.9,y:20}} animate={{scale:1,y:0}} exit={{scale:0.9,y:20}}
            onClick={e=>e.stopPropagation()}
            className="bg-slate-900 rounded-2xl p-8 border border-slate-700 max-w-md w-full">
            <div className="flex gap-1 mb-6">
              {STEPS.map((_,i)=><div key={i} className={`flex-1 h-1 rounded-full transition-all ${i<=step?'bg-amber-400':'bg-slate-700'}`}/>)}
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-amber-400 font-semibold uppercase tracking-wider">✨ Mode cadeau</span>
              <button onClick={onClose} className="text-slate-600 hover:text-slate-400">×</button>
            </div>
            <h3 className="text-xl font-bold text-white mb-6">{cur.question}</h3>
            <div className="grid grid-cols-2 gap-3">
              {cur.options.map(opt=>(
                <motion.button key={opt.value} whileTap={{scale:0.95}} onClick={()=>handleAnswer(opt.value)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-700 hover:border-amber-400/50 bg-slate-800 hover:bg-amber-400/5 transition-all">
                  <span className="text-3xl">{opt.emoji}</span>
                  <span className="text-sm text-slate-200 font-medium">{opt.label}</span>
                </motion.button>
              ))}
            </div>
            {step>0&&<button onClick={()=>setStep(step-1)} className="mt-4 text-xs text-slate-500 hover:text-slate-300">← Retour</button>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
