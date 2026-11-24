import { useEffect, useState } from 'react'

// Vrai quand la requête média correspond (ex. « (min-width: 1024px) »), suivi en direct
// (rotation d'une tablette, fenêtre redimensionnée)
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)

  useEffect(() => {
    const list = window.matchMedia(query)
    const update = () => setMatches(list.matches)
    update()
    list.addEventListener('change', update)
    return () => list.removeEventListener('change', update)
  }, [query])

  return matches
}
