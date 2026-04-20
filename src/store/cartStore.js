import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useCartStore = create(persist(
  (set, get) => ({
    items: [],

    addItem: (config, price, previewSVG) => {
      const item = {
        id:        `cart_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        config,
        price,
        previewSVG: previewSVG ?? null,
        quantity:  1,
        addedAt:   Date.now(),
      }
      set(state => ({ items: [...state.items, item] }))
      return item.id
    },

    removeItem: (id) =>
      set(state => ({ items: state.items.filter(i => i.id !== id) })),

    updateQuantity: (id, qty) =>
      set(state => ({
        items: state.items.map(i => i.id === id ? { ...i, quantity: Math.max(1, qty) } : i),
      })),

    clearCart: () => set({ items: [] }),

    getTotal:     () => get().items.reduce((s, i) => s + i.price * i.quantity, 0),
    getItemCount: () => get().items.reduce((s, i) => s + i.quantity, 0),
  }),
  { name: 'lumicut_cart' }
))
