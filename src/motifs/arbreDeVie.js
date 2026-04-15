export const arbreDeVie = {
  id: 'arbre-de-vie',
  name: 'Arbre de Vie',
  category: 'nature',
  description: 'Le motif emblématique, idéal pour un salon',
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <rect width="200" height="200" fill="white"/>
  <g fill="black">
    <!-- Outer circle -->
    <path d="M100,10 A90,90 0 1,1 99.9,10 Z" fill="none" stroke="black" stroke-width="3"/>
    <!-- Trunk -->
    <rect x="97" y="120" width="6" height="55" rx="2"/>
    <!-- Roots spreading left and right -->
    <path d="M97,165 Q80,170 70,180" stroke="black" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M103,165 Q120,170 130,180" stroke="black" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M97,155 Q75,162 62,175" stroke="black" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M103,155 Q125,162 138,175" stroke="black" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M98,148 Q85,158 78,170" stroke="black" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M102,148 Q115,158 122,170" stroke="black" stroke-width="2" fill="none" stroke-linecap="round"/>
    <!-- Main branches -->
    <path d="M100,120 Q85,100 70,80" stroke="black" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M100,120 Q115,100 130,80" stroke="black" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M100,105 Q100,85 100,65" stroke="black" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M100,110 Q78,95 62,85" stroke="black" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M100,110 Q122,95 138,85" stroke="black" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <!-- Secondary branches -->
    <path d="M85,97 Q75,80 68,65" stroke="black" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M115,97 Q125,80 132,65" stroke="black" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M100,85 Q88,72 80,58" stroke="black" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M100,85 Q112,72 120,58" stroke="black" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M93,75 Q85,62 82,48" stroke="black" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <path d="M107,75 Q115,62 118,48" stroke="black" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <!-- Leaves as small circles on branch tips -->
    <circle cx="70" cy="80" r="5"/><circle cx="130" cy="80" r="5"/>
    <circle cx="100" cy="63" r="5"/><circle cx="62" cy="85" r="4"/>
    <circle cx="138" cy="85" r="4"/><circle cx="68" cy="65" r="4"/>
    <circle cx="132" cy="65" r="4"/><circle cx="80" cy="58" r="4"/>
    <circle cx="120" cy="58" r="4"/><circle cx="82" cy="48" r="3.5"/>
    <circle cx="118" cy="48" r="3.5"/><circle cx="100" cy="42" r="4"/>
    <circle cx="75" cy="55" r="3"/><circle cx="125" cy="55" r="3"/>
    <circle cx="90" cy="38" r="3"/><circle cx="110" cy="38" r="3"/>
    <circle cx="60" cy="75" r="3"/><circle cx="140" cy="75" r="3"/>
    <circle cx="72" cy="52" r="3"/><circle cx="128" cy="52" r="3"/>
    <circle cx="85" cy="32" r="3"/><circle cx="115" cy="32" r="3"/>
    <circle cx="100" cy="28" r="3.5"/>
  </g>
</svg>`
}
