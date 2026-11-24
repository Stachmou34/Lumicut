import { useEffect, useRef } from 'react'
import { useConfiguratorStore } from '../store/configuratorStore'
import { designFromState } from './panelDesign'
import { analyzeCut } from './cutAnalysis'
import { getPanelMaterial } from './panelMaterials'
import { stripBandMm, scaleToClearBand } from './stripBand'
import { SCALE_LIMITS } from './panelEditing'

// Recalcule le contrôle de fabrication à chaque changement du design (après une courte pause),
// et le range dans le store pour la carte d'état, la vue 2D et la vue 3D.
// La bande réservée au ruban dépend du ruban et de la matière choisis : elle est recontrôlée
// quand on change de ruban à l'étape Éclairage.
// Nouveau motif ou nouveau format : le motif se règle de lui-même à la plus grande taille qui laisse
// la bande libre (les motifs du catalogue remplissent leur carré). Agrandi à la main, ou avec un ruban
// plus large choisi ensuite, il est seulement signalé, avec la correction proposée.
export function useCutCheckSync() {
  const state = useConfiguratorStore()
  const design = designFromState(state)
  const minBridgeMm = getPanelMaterial(state.material).minBridgeMm
  const bandMm = stripBandMm(state.lightModel, state.material)
  const key = JSON.stringify([design, minBridgeMm, bandMm])
  // « Identité » du motif et du format (sans son échelle) : quand elle change, le motif sera réglé
  // automatiquement dès qu'il est chargé (un motif du catalogue arrive d'abord vide)
  const fitKey = [
    state.motifId, design.width, design.height, state.cutStyle ?? '', state.libraryStyles,
    JSON.stringify(state.generator ?? null), state.aiMotifSvg?.length ?? 0,
  ].join('|')
  const lastFit = useRef(null)
  const fitPending = useRef(false)
  const autoFit = useRef(null)

  useEffect(() => {
    let cancelled = false
    const { cutCheck, setCutCheck } = useConfiguratorStore.getState()
    setCutCheck({ ...(cutCheck ?? {}), pending: true })

    const timer = setTimeout(async () => {
      try {
        const full = await analyzeCut(design, { minBridgeMm, stripBandMm: bandMm })
        // Part du texte : on compare avec le même panneau sans texte (îlots et bande du ruban)
        const hasText = Boolean(design.showText && (design.textContent || design.textSecondary))
        const motifOnly = hasText
          ? await analyzeCut({ ...design, showText: false }, { minBridgeMm, islandsOnly: true, stripBandMm: bandMm })
          : full
        const textIslands = Math.max(0, full.islands.length - motifOnly.islands.length)

        // Bande du ruban : qui y entre (motif, texte), et l'échelle qui en sort le motif
        let stripBand = null
        if (full.stripBand) {
          const motifInBand = Boolean(motifOnly.stripBand)
          const textInBand = hasText && full.bandAreaMm2 - motifOnly.bandAreaMm2 >= 2
          const scale = motifInBand && !design.fullPanel
            ? scaleToClearBand({
              width: design.width,
              height: design.height,
              motifScale: design.motifScale,
              motifX: design.motifX,
              motifY: design.motifY,
              box: motifOnly.cutBox,
              bandCm: bandMm / 10,
              minScale: SCALE_LIMITS.motif[0],
            })
            : null
          stripBand = { ...full.stripBand, motifInBand, textInBand, fixScale: scale !== null && scale < design.motifScale ? scale : null }
        }
        if (cancelled) return
        // Motif ou format qui vient de changer : réglage automatique de l'échelle, une seule fois,
        // quand le motif est chargé (un nouveau contrôle suit le réglage)
        if (lastFit.current !== null && lastFit.current !== fitKey) {
          fitPending.current = true
          autoFit.current = null
        }
        lastFit.current = fitKey
        if (fitPending.current && motifOnly.cutBox) {
          fitPending.current = false
          if (stripBand?.fixScale) {
            autoFit.current = { from: design.motifScale, to: stripBand.fixScale }
            useConfiguratorStore.getState().setMotifTransform({ motifScale: stripBand.fixScale })
            return
          }
        }
        const status = full.islands.length ? 'bad' : full.fragile.length || full.thin.length || stripBand ? 'warn' : 'ok'
        setCutCheck({
          pending: false,
          status,
          islands: full.islands,
          fragile: full.fragile,
          thin: full.thin,
          textIslands,
          stripBand,
          autoFit: autoFit.current,
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
