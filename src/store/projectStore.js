import { create } from 'zustand'
import { templates } from '../templates/index.js'

const defaultTemplate = templates[0]

export const useProjectStore = create((set, get) => ({
  // Active template
  template: defaultTemplate,
  setTemplate: (tpl) => set({ template: tpl, params: { ...tpl.defaultParams } }),

  // Parameters
  params: { ...defaultTemplate.defaultParams },
  setParam: (key, value) => set(state => ({ params: { ...state.params, [key]: value } })),
  setParams: (params) => set({ params }),

  // Board config
  boardWidth: 600,
  boardHeight: 400,
  setBoardSize: (w, h) => set({ boardWidth: w, boardHeight: h }),

  // View mode
  viewMode: '3d', // '3d' | '2d'
  setViewMode: (mode) => set({ viewMode: mode }),
}))
