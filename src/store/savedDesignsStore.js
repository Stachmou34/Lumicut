import{create}from'zustand'
import{serializeDesign,deserializeDesign}from'../lib/designSerializer'
const LS_KEY='lumicut_saved_designs'
const MAX=10
const load=()=>{try{return JSON.parse(localStorage.getItem(LS_KEY)||'[]')}catch{return[]}}
const save=items=>localStorage.setItem(LS_KEY,JSON.stringify(items))

export const useSavedDesignsStore=create((set,get)=>({
  designs:load(),
  saveDesign:(state,name)=>{
    const encoded=serializeDesign(state)
    if(!encoded)return
    const d={id:Date.now(),name:name||`Design ${new Date().toLocaleDateString('fr-FR')}`,encoded,savedAt:new Date().toISOString(),preview:{motifId:state.motifId,ledColor:state.ledColor,width:state.width,height:state.height}}
    const updated=[d,...get().designs].slice(0,MAX)
    save(updated);set({designs:updated})
  },
  deleteDesign:(id)=>{const u=get().designs.filter(d=>d.id!==id);save(u);set({designs:u})},
  loadDesign:(id)=>{const d=get().designs.find(d=>d.id===id);return d?deserializeDesign(d.encoded):null},
}))
