export const cerf = {
  id: 'cerf',
  name: 'Cerf majestueux',
  category: 'animaux',
  description: 'Silhouette de cerf avec son bois imposant',
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <rect width="200" height="200" fill="white"/>
  <g fill="black">
    <!-- Body (ellipse torso) -->
    <ellipse cx="105" cy="130" rx="42" ry="28"/>
    <!-- Neck -->
    <path d="M80,120 Q75,105 78,90 Q82,80 88,78 Q94,105 95,120 Z"/>
    <!-- Head -->
    <ellipse cx="84" cy="76" rx="14" ry="11" transform="rotate(-15,84,76)"/>
    <!-- Snout -->
    <ellipse cx="74" cy="80" rx="8" ry="5" transform="rotate(-10,74,80)"/>
    <!-- Eye -->
    <circle cx="80" cy="70" r="2.5" fill="white"/>
    <circle cx="80" cy="70" r="1.5"/>
    <!-- Ear -->
    <ellipse cx="94" cy="65" rx="5" ry="9" transform="rotate(20,94,65)"/>
    <!-- Antler left main -->
    <path d="M90,65 Q88,50 85,38 Q82,28 80,18" stroke="black" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <!-- Antler left branch 1 -->
    <path d="M87,50 Q79,42 72,36" stroke="black" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <!-- Antler left branch 2 -->
    <path d="M84,40 Q76,34 70,26" stroke="black" stroke-width="2" fill="none" stroke-linecap="round"/>
    <!-- Antler left tip branch -->
    <path d="M82,28 Q78,22 76,14" stroke="black" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <path d="M80,18 Q82,12 86,8" stroke="black" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <!-- Antler right main -->
    <path d="M96,62 Q100,48 104,36 Q107,25 108,15" stroke="black" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <!-- Antler right branch 1 -->
    <path d="M100,48 Q108,40 116,35" stroke="black" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <!-- Antler right branch 2 -->
    <path d="M103,37 Q112,30 118,22" stroke="black" stroke-width="2" fill="none" stroke-linecap="round"/>
    <!-- Antler right tip -->
    <path d="M106,25 Q110,18 112,10" stroke="black" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <path d="M108,15 Q106,8 104,4" stroke="black" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <!-- Front legs -->
    <rect x="82" y="155" width="9" height="32" rx="3"/>
    <rect x="97" y="155" width="9" height="32" rx="3"/>
    <!-- Back legs -->
    <rect x="117" y="152" width="9" height="34" rx="3"/>
    <rect x="132" y="152" width="9" height="34" rx="3"/>
    <!-- Hooves -->
    <rect x="81" y="183" width="11" height="5" rx="2"/>
    <rect x="96" y="183" width="11" height="5" rx="2"/>
    <rect x="116" y="182" width="11" height="5" rx="2"/>
    <rect x="131" y="182" width="11" height="5" rx="2"/>
    <!-- Tail -->
    <ellipse cx="147" cy="120" rx="8" ry="6" transform="rotate(-20,147,120)"/>
  </g>
</svg>`
}
