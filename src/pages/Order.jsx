import { Link } from 'react-router-dom'
import { useProjectStore } from '../store/projectStore'

export default function Order() {
  const { template, params } = useProjectStore()

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-lg mx-auto">
        <Link to="/box/configurator" className="text-slate-400 hover:text-sky-400 text-sm mb-6 inline-block">
          ← Retour au configurateur
        </Link>
        <div className="bg-slate-800 rounded-xl p-8 border border-slate-700">
          <h1 className="text-2xl font-bold text-white mb-2">Commander</h1>
          <p className="text-slate-400 mb-6">
            La commande directe sera disponible prochainement.
          </p>
          <div className="bg-slate-700/50 rounded-lg p-4 mb-6">
            <div className="text-sm text-slate-300 font-semibold mb-2">Votre configuration</div>
            <div className="text-xs text-slate-400">
              <div>Template : {template.name}</div>
              <div>Dimensions : {params.width}×{params.depth}×{params.height || '-'}mm</div>
              <div>Épaisseur : {params.thickness}mm</div>
            </div>
          </div>
          <div className="text-sm text-slate-400">
            En attendant, téléchargez le fichier DXF depuis le configurateur
            et envoyez-le à votre atelier de découpe laser.
          </div>
        </div>
      </div>
    </div>
  )
}
