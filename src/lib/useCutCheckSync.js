import { useEffect } from 'react'
import { useConfiguratorStore } from '../store/configuratorStore'
import { designFromState } from './panelDesign'
import { analyzeCut } from './cutAnalysis'
import { getPanelMaterial } from './panelMaterials'

// Recalcule le contrôle de fabrication à chaque changement du design (après une courte pause),
// et le range dans le store pour la carte d'état, la vue 2D et la vue 3D.
export function useCutCheckSync() {
  const state = useConfiguratorStore()
  const design = designFromState(state)
  const minBridgeMm = getPanelMaterial(state.material).minBridgeMm
  const key = JSON.stringify([design, minBridgeMm])

  useEffect(() => {
    let cancelled = false
    const { cutCheck, setCutCheck } = useConfiguratorStore.getState()
    setCutCheck({ ...(cutCheck ?? {}), pending: true })

    const timer = setTimeout(async () => {
      try {
        const full = await analyzeCut(design, { minBridgeMm })
        // Part du texte : on compare avec le même panneau sans texte
        let textIslands = 0
        if (design.showText && (design.textContent || design.textSecondary)) {
          const withoutText = await analyzeCut({ ...design, showText: false }, { minBridgeMm, islandsOnly: true })
          textIslands = Math.max(0, full.islands.length - withoutText.islands.length)
        }
        if (cancelled) return
        const status = full.islands.length ? 'bad' : full.fragile.length || full.thin.length ? 'warn' : 'ok'
        setCutCheck({
          pending: false,
          status,
          islands: full.islands,
          fragile: full.fragile,
          thin: full.thin,
          textIslands,
          minBridgeMm,
          overlayUrl: status === 'ok' ? null : full.overlay.toDataURL('image/png'),
        })
      } catch (err) {
        if (!cancelled) setCutCheck({ pending: false, status: 'error', error: err.message })
      }
    }, 450)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
}
