export const mandala = {
  id: 'mandala',
  name: 'Mandala',
  category: 'geometrique',
  description: 'Motif géométrique à symétrie radiale',
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <rect width="200" height="200" fill="white"/>
  <g fill="black" transform="translate(100,100)">
    <!-- Center dot -->
    <circle r="4"/>
    <!-- Ring 1 -->
    <circle r="10" fill="none" stroke="black" stroke-width="2"/>
    <!-- 8 petals ring 1 -->
    <ellipse cx="16.0" cy="0.0" rx="4" ry="7" transform="rotate(0 16.0 0.0)"/>
    <ellipse cx="11.3" cy="11.3" rx="4" ry="7" transform="rotate(45 11.3 11.3)"/>
    <ellipse cx="0.0" cy="16.0" rx="4" ry="7" transform="rotate(90 0.0 16.0)"/>
    <ellipse cx="-11.3" cy="11.3" rx="4" ry="7" transform="rotate(135 -11.3 11.3)"/>
    <ellipse cx="-16.0" cy="0.0" rx="4" ry="7" transform="rotate(180 -16.0 0.0)"/>
    <ellipse cx="-11.3" cy="-11.3" rx="4" ry="7" transform="rotate(225 -11.3 -11.3)"/>
    <ellipse cx="-0.0" cy="-16.0" rx="4" ry="7" transform="rotate(270 -0.0 -16.0)"/>
    <ellipse cx="11.3" cy="-11.3" rx="4" ry="7" transform="rotate(315 11.3 -11.3)"/>
    <!-- Ring 2 -->
    <circle r="28" fill="none" stroke="black" stroke-width="1.5"/>
    <!-- 8 diamonds ring 2 -->
    <ellipse cx="31.4" cy="13.0" rx="3" ry="8" transform="rotate(22.5 31.4 13.0)"/>
    <ellipse cx="13.0" cy="31.4" rx="3" ry="8" transform="rotate(67.5 13.0 31.4)"/>
    <ellipse cx="-13.0" cy="31.4" rx="3" ry="8" transform="rotate(112.5 -13.0 31.4)"/>
    <ellipse cx="-31.4" cy="13.0" rx="3" ry="8" transform="rotate(157.5 -31.4 13.0)"/>
    <ellipse cx="-31.4" cy="-13.0" rx="3" ry="8" transform="rotate(202.5 -31.4 -13.0)"/>
    <ellipse cx="-13.0" cy="-31.4" rx="3" ry="8" transform="rotate(247.5 -13.0 -31.4)"/>
    <ellipse cx="13.0" cy="-31.4" rx="3" ry="8" transform="rotate(292.5 13.0 -31.4)"/>
    <ellipse cx="31.4" cy="-13.0" rx="3" ry="8" transform="rotate(337.5 31.4 -13.0)"/>
    <!-- Ring 3 -->
    <circle r="45" fill="none" stroke="black" stroke-width="1.5"/>
    <!-- 16 small dots -->
    <circle cx="52.0" cy="0.0" r="3"/>
    <circle cx="48.0" cy="19.9" r="3"/>
    <circle cx="36.8" cy="36.8" r="3"/>
    <circle cx="19.9" cy="48.0" r="3"/>
    <circle cx="0.0" cy="52.0" r="3"/>
    <circle cx="-19.9" cy="48.0" r="3"/>
    <circle cx="-36.8" cy="36.8" r="3"/>
    <circle cx="-48.0" cy="19.9" r="3"/>
    <circle cx="-52.0" cy="0.0" r="3"/>
    <circle cx="-48.0" cy="-19.9" r="3"/>
    <circle cx="-36.8" cy="-36.8" r="3"/>
    <circle cx="-19.9" cy="-48.0" r="3"/>
    <circle cx="-0.0" cy="-52.0" r="3"/>
    <circle cx="19.9" cy="-48.0" r="3"/>
    <circle cx="36.8" cy="-36.8" r="3"/>
    <circle cx="48.0" cy="-19.9" r="3"/>
    <!-- Ring 4 -->
    <circle r="62" fill="none" stroke="black" stroke-width="1.5"/>
    <!-- 8 large petals outer -->
    <ellipse cx="72.0" cy="0.0" rx="5" ry="12" transform="rotate(0 72.0 0.0)"/>
    <ellipse cx="50.9" cy="50.9" rx="5" ry="12" transform="rotate(45 50.9 50.9)"/>
    <ellipse cx="0.0" cy="72.0" rx="5" ry="12" transform="rotate(90 0.0 72.0)"/>
    <ellipse cx="-50.9" cy="50.9" rx="5" ry="12" transform="rotate(135 -50.9 50.9)"/>
    <ellipse cx="-72.0" cy="0.0" rx="5" ry="12" transform="rotate(180 -72.0 0.0)"/>
    <ellipse cx="-50.9" cy="-50.9" rx="5" ry="12" transform="rotate(225 -50.9 -50.9)"/>
    <ellipse cx="-0.0" cy="-72.0" rx="5" ry="12" transform="rotate(270 -0.0 -72.0)"/>
    <ellipse cx="50.9" cy="-50.9" rx="5" ry="12" transform="rotate(315 50.9 -50.9)"/>
    <!-- Outer ring -->
    <circle r="88" fill="none" stroke="black" stroke-width="2.5"/>
    <!-- 24 outer dots -->
    <circle cx="84.0" cy="0.0" r="2.5"/>
    <circle cx="81.1" cy="21.7" r="2.5"/>
    <circle cx="72.7" cy="42.0" r="2.5"/>
    <circle cx="59.4" cy="59.4" r="2.5"/>
    <circle cx="42.0" cy="72.7" r="2.5"/>
    <circle cx="21.7" cy="81.1" r="2.5"/>
    <circle cx="0.0" cy="84.0" r="2.5"/>
    <circle cx="-21.7" cy="81.1" r="2.5"/>
    <circle cx="-42.0" cy="72.7" r="2.5"/>
    <circle cx="-59.4" cy="59.4" r="2.5"/>
    <circle cx="-72.7" cy="42.0" r="2.5"/>
    <circle cx="-81.1" cy="21.7" r="2.5"/>
    <circle cx="-84.0" cy="0.0" r="2.5"/>
    <circle cx="-81.1" cy="-21.7" r="2.5"/>
    <circle cx="-72.7" cy="-42.0" r="2.5"/>
    <circle cx="-59.4" cy="-59.4" r="2.5"/>
    <circle cx="-42.0" cy="-72.7" r="2.5"/>
    <circle cx="-21.7" cy="-81.1" r="2.5"/>
    <circle cx="-0.0" cy="-84.0" r="2.5"/>
    <circle cx="21.7" cy="-81.1" r="2.5"/>
    <circle cx="42.0" cy="-72.7" r="2.5"/>
    <circle cx="59.4" cy="-59.4" r="2.5"/>
    <circle cx="72.7" cy="-42.0" r="2.5"/>
    <circle cx="81.1" cy="-21.7" r="2.5"/>
  </g>
</svg>`
}
