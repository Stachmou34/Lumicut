function getHolidays(year) {
  const fixed = [
    `${year}-01-01`,`${year}-05-01`,`${year}-05-08`,`${year}-07-14`,
    `${year}-08-15`,`${year}-11-01`,`${year}-11-11`,`${year}-12-25`,
  ]
  function easter(y) {
    const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4
    const f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3)
    const h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4
    const l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451)
    const mo=Math.floor((h+l-7*m+114)/31),day=((h+l-7*m+114)%31)+1
    return new Date(y,mo-1,day)
  }
  const e=easter(year)
  const fmt=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  const em=new Date(e); em.setDate(e.getDate()+1)
  const asc=new Date(e); asc.setDate(e.getDate()+39)
  const pen=new Date(e); pen.setDate(e.getDate()+50)
  return new Set([...fixed,fmt(em),fmt(asc),fmt(pen)])
}

function isBusinessDay(date) {
  const day=date.getDay()
  if(day===0||day===6)return false
  const key=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
  return !getHolidays(date.getFullYear()).has(key)
}

function addBusinessDays(start,days) {
  let d=new Date(start),added=0
  while(added<days){d.setDate(d.getDate()+1);if(isBusinessDay(d))added++}
  return d
}

const DAYS_FR=['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi']
const MONTHS_FR=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre']

export function computeDeliveryDate(now=new Date()){
  const isWD=isBusinessDay(now)
  const days=(isWD&&now.getHours()<12)?7:8
  const d=addBusinessDays(now,days)
  return{
    date:d,
    label:`${DAYS_FR[d.getDay()]} ${d.getDate()} ${MONTHS_FR[d.getMonth()]}`,
    businessDays:days
  }
}
