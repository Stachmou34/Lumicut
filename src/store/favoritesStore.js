import { create } from 'zustand'

const STORAGE_KEY = 'lumicut_favorites'

function loadFavorites() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function saveFavorites(favorites) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites))
  } catch {}
}

export const useFavoritesStore = create((set, get) => ({
  favorites: loadFavorites(), // [{id, slug, title, thumbnailUrl, cleanedSVG}]

  addFavorite: (motif) => {
    const favorites = [motif, ...get().favorites.filter(f => f.id !== motif.id)]
    saveFavorites(favorites)
    set({ favorites })
  },

  removeFavorite: (id) => {
    const favorites = get().favorites.filter(f => f.id !== id)
    saveFavorites(favorites)
    set({ favorites })
  },

  isFavorite: (id) => get().favorites.some(f => f.id === id),
}))
