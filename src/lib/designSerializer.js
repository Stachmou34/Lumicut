const KEYS=['motifId','motifScale','motifX','motifY','motifRotation','motifMirrorH','motifMirrorV',
  'showText','textContent','textSecondary','textFont','textAlign','textLetterSpacing','textSize','textPosition',
  'sizePreset','width','height','material','ledColor','ledPreset','dimmer','mounting','engraving','giftWrap']

export function serializeDesign(state){
  const data={}
  for(const k of KEYS)if(k in state)data[k]=state[k]
  try{return btoa(JSON.stringify(data))}catch{return null}
}

export function deserializeDesign(encoded){
  try{return JSON.parse(atob(encoded))}catch{return null}
}

export function buildShareUrl(state){
  const encoded=serializeDesign(state)
  if(!encoded)return null
  const url=new URL(window.location.href)
  url.pathname='/studio'
  url.search=`?design=${encoded}`
  return url.toString()
}
