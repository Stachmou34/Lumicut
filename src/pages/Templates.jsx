import { Link } from 'react-router-dom'
import { templates } from '../templates/index'
import TemplateCard from '../components/TemplateCard'

export default function Templates() {
  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Laser Cut Configurator</h1>
            <p className="text-slate-400 mt-1">Choisissez un template pour commencer</p>
          </div>
          <Link to="/box/configurator" className="text-sky-400 hover:text-sky-300 text-sm transition-colors">
            Configurateur →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {templates.map(t => (
            <TemplateCard key={t.id} template={t} />
          ))}
        </div>
      </div>
    </div>
  )
}
