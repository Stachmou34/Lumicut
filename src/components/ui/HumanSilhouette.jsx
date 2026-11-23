// Silhouette humaine de référence (170 cm de haut, 48 cm de large) pour juger de la taille d'un panneau
export default function HumanSilhouette({ className = '', fill = '#64748b' }) {
  return (
    <svg viewBox="0 0 48 170" className={className} aria-hidden="true" preserveAspectRatio="xMidYMax meet">
      <ellipse cx="24" cy="14" rx="10" ry="13" fill={fill} />
      <path d="M10,30 Q8,60 10,90 H38 Q40,60 38,30 Q31,26 24,26 Q17,26 10,30Z" fill={fill} />
      <path d="M10,35 Q2,55 4,75 Q7,77 10,75 Q11,60 14,42Z" fill={fill} />
      <path d="M38,35 Q46,55 44,75 Q41,77 38,75 Q37,60 34,42Z" fill={fill} />
      <path d="M14,88 Q12,115 12,140 Q14,145 18,144 Q20,120 20,92Z" fill={fill} />
      <path d="M34,88 Q36,115 36,140 Q34,145 30,144 Q28,120 28,92Z" fill={fill} />
      <ellipse cx="15" cy="146" rx="6" ry="4" fill={fill} />
      <ellipse cx="33" cy="146" rx="6" ry="4" fill={fill} />
    </svg>
  )
}
