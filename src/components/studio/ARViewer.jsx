import{useState,useRef,useEffect}from'react'
import{motion,AnimatePresence}from'framer-motion'
import{useConfiguratorStore}from'../../store/configuratorStore'
import{motifs}from'../../motifs/index'

const MAT_BG={'acrylic-black':'#0a0a0a','acrylic-white':'#f0f0ee','acrylic-smoked':'#1a1a2e','birch-plywood':'#c8a97a','mdf-black':'#111'}

export default function ARViewer({show,onClose}){
  const{motifId,material,ledColor,lightOn,width,height}=useConfiguratorStore()
  const[arSupported,setArSupported]=useState(null)
  const[active,setActive]=useState(false)
  const[stream,setStream]=useState(null)
  const[arLight,setArLight]=useState(true)
  const[flash,setFlash]=useState(false)
  const videoRef=useRef(null)
  const canvasRef=useRef(null)
  const motif=motifs.find(m=>m.id===motifId)||motifs[0]
  const panelBg=MAT_BG[material]||'#0a0a0a'

  useEffect(()=>{
    if(!show)return
    async function check(){
      if(!navigator.xr){setArSupported(false);return}
      try{const s=await navigator.xr.isSessionSupported('immersive-ar');setArSupported(s)}
      catch{setArSupported(false)}
    }
    check()
  },[show])

  const startCamera=async()=>{
    try{
      const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}})
      setStream(s);setActive(true)
      if(videoRef.current){videoRef.current.srcObject=s;videoRef.current.play()}
    }catch{alert('Impossible d\'accéder à la caméra.')}
  }

  const stopCamera=()=>{stream?.getTracks().forEach(t=>t.stop());setStream(null);setActive(false)}

  const handleClose=()=>{stopCamera();onClose()}

  const capture=()=>{
    if(!videoRef.current||!canvasRef.current)return
    const cv=canvasRef.current,vd=videoRef.current
    cv.width=vd.videoWidth;cv.height=vd.videoHeight
    const ctx=cv.getContext('2d')
    ctx.drawImage(vd,0,0)
    const pw=Math.round(cv.width*0.4),ph=Math.round(pw/(width/height))
    const px=Math.round((cv.width-pw)/2),py=Math.round((cv.height-ph)/2)
    ctx.fillStyle=panelBg;ctx.fillRect(px,py,pw,ph)
    if(arLight){ctx.shadowColor=ledColor;ctx.shadowBlur=30;ctx.strokeStyle=ledColor;ctx.lineWidth=2;ctx.strokeRect(px,py,pw,ph)}
    setFlash(true);setTimeout(()=>setFlash(false),300)
    cv.toBlob(blob=>{const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='lumicut-ar.jpg';a.click();URL.revokeObjectURL(url)},'image/jpeg',0.92)
  }

  const svgInner=motif.svg.replace(/<\/?svg[^>]*>/g,'').replace(/<rect[^>]*fill="white"[^>]*\/>/g,'')

  return(
    <AnimatePresence>
      {show&&(
        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 bg-black flex flex-col">
          {!active?(
            <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
              <div className="text-6xl mb-6">📱</div>
              <h2 className="text-2xl font-bold text-white mb-3">Voir sur mon mur</h2>
              {arSupported===false&&(
                <div className="bg-amber-900/30 border border-amber-700/40 rounded-xl p-4 mb-6 text-sm text-amber-300 max-w-sm">
                  WebXR non disponible sur ce navigateur.<br/>
                  <span className="text-amber-500 text-xs">Essayez Chrome Android pour l'AR native.</span>
                </div>
              )}
              <div className="flex flex-col gap-3 w-full max-w-xs">
                {arSupported&&(
                  <button onClick={()=>alert('WebXR AR — disponible sur Chrome Android avec ARCore.')}
                    className="py-3 bg-amber-400 hover:bg-amber-300 text-black font-bold rounded-full transition-colors">
                    🔮 Réalité augmentée WebXR
                  </button>
                )}
                <button onClick={startCamera} className="py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-full transition-colors">
                  📷 {arSupported===false?'Mode caméra (remplacement)':'Mode caméra simple'}
                </button>
                <button onClick={handleClose} className="text-slate-500 hover:text-slate-300 text-sm">Annuler</button>
              </div>
            </div>
          ):(
            <div className="relative flex-1 overflow-hidden">
              <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted/>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="rounded-sm overflow-hidden" style={{width:'40vw',aspectRatio:`${width}/${height}`,background:panelBg,border:'2px solid rgba(255,255,255,0.2)',boxShadow:arLight?`0 0 40px 10px ${ledColor}99`:'0 10px 40px rgba(0,0,0,0.6)'}}>
                  <svg viewBox="0 0 200 200" width="100%" height="100%">
                    <defs>{arLight&&<filter id="ar-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>}</defs>
                    <g dangerouslySetInnerHTML={{__html:arLight?svgInner.replace(/fill="black"/g,`fill="${ledColor}"`).replace(/stroke="black"/g,`stroke="${ledColor}"`):svgInner.replace(/fill="black"/g,'fill="rgba(255,255,255,0.08)"').replace(/stroke="black"/g,'stroke="rgba(255,255,255,0.08)"')}} style={{filter:arLight?'url(#ar-glow)':'none'}}/>
                  </svg>
                </div>
              </div>
              <div className="absolute top-4 left-0 right-0 text-center pointer-events-none">
                <div className="inline-block bg-black/50 text-white text-xs px-3 py-1.5 rounded-full">Pointez vers votre mur</div>
              </div>
              {flash&&<div className="absolute inset-0 bg-white pointer-events-none"/>}
              <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-6">
                <button onClick={()=>setArLight(!arLight)} className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-lg ${arLight?'border-amber-400 bg-amber-400/20':'border-slate-500 bg-black/50'}`}>💡</button>
                <button onClick={capture} className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-xl border-4 border-slate-300"><div className="w-12 h-12 rounded-full bg-white border-2 border-slate-400"/></button>
                <button onClick={handleClose} className="w-12 h-12 rounded-full bg-black/50 border border-slate-600 flex items-center justify-center text-white text-xl">×</button>
              </div>
              <canvas ref={canvasRef} className="hidden"/>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
