import{useMemo}from'react'
import{computeDeliveryDate}from'../../lib/deliveryDate'

export default function DeliveryEstimate(){
  const{label,businessDays}=useMemo(()=>computeDeliveryDate(new Date()),[])
  return(
    <div className="flex items-center gap-2 text-xs bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700/50">
      <span className="text-base">📦</span>
      <div>
        <span className="text-slate-500">Commandé aujourd'hui → </span>
        <span className="text-emerald-400 font-medium">livré le {label}</span>
        <span className="text-slate-600 ml-1">({businessDays}j ouvrés)</span>
      </div>
    </div>
  )
}
