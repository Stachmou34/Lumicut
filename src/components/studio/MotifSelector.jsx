import { useState } from 'react'
import { useConfiguratorStore } from '../../store/configuratorStore'
import {
  CATALOG, CATALOG_CATEGORIES, catalogThumbnail, isCatalogItemSelected,
} from '../../motifs/catalog'
import SVGRepoSearch from './SVGRepoSearch'
import GeneratorPanel from './GeneratorPanel'
import FabricationCheck from './FabricationCheck'
import MotifThumb from './MotifThumb'
import LibraryBrowser from './LibraryBrowser'
import CutStylePicker from './CutStylePicker'
import { Segmented } from './StepUI'

const TABS = [
  { id: 'catalog', label: 'Catalogue' },
  { id: 'create', label: '✨ Créer' },
  { id: 'online', label: 'En ligne' },
]

// Idées de départ de l'onglet « Créer » : motifs générés (découpe vérifiée) et motifs historiques
function IdeasGrid() {
  const state = useConfiguratorStore()
  const [category, setCategory] = useState('all')
  const items = category === 'all' ? CATALOG : CATALOG.filter(i => i.category === category)

  const select = item => {
    if (item.kind === 'static') state.setMotifId(item.id)
    else state.setGenerator(item.generator, item.name)
  }

  return (
    <div className="flex flex-col gap-3 border-t border-slate-700 pt-4">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Idées de départ</div>
      <div className="flex gap-1 flex-wrap">
        {CATALOG_CATEGORIES.map(c => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={`px-2.5 py-1 rounded-full text-xs transition-colors ${category === c.id ? 'bg-amber-500 text-black font-semibold' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => select(item)}
            className={`rounded-lg overflow-hidden border-2 text-left transition-all ${isCatalogItemSelected(item, state) ? 'border-amber-400 shadow-lg shadow-amber-400/20' : 'border-slate-700 hover:border-slate-500'}`}
          >
            <MotifThumb svg={catalogThumbnail(item).svg} />
            <div className="px-2 py-1.5 bg-slate-800 flex items-center justify-between gap-1">
              <span className="text-xs font-medium text-slate-200 truncate">{item.name}</span>
              {item.verified && (
                <span title="Découpe vérifiée : aucun morceau ne tombe" className="text-[10px] text-emerald-400 flex-shrink-0">✓</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function MotifSelector() {
  const [tab, setTab] = useState('catalog')

  return (
    <div className="flex flex-col gap-4">
      <FabricationCheck />
      <CutStylePicker />

      <Segmented options={TABS} value={tab} onChange={setTab} label="Source du motif" />

      {tab === 'catalog' && <LibraryBrowser />}
      {tab === 'create' && (
        <>
          <GeneratorPanel />
          <IdeasGrid />
        </>
      )}
      {tab === 'online' && <SVGRepoSearch />}
    </div>
  )
}
