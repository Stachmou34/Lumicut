import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '../store/projectStore'

export default function TemplateCard({ template }) {
  const navigate = useNavigate()
  const setTemplate = useProjectStore(s => s.setTemplate)

  const handleSelect = () => {
    setTemplate(template)
    navigate('/box/configurator')
  }

  return (
    <button
      onClick={handleSelect}
      className="bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-sky-500 rounded-xl p-5 text-left transition-all group flex flex-col gap-3"
    >
      <div className="text-4xl">{template.emoji}</div>
      <div>
        <div className="font-semibold text-slate-100 group-hover:text-sky-400 transition-colors">
          {template.name}
        </div>
        <div className="text-xs text-slate-400 mt-1">{template.description}</div>
      </div>
      <div className="text-xs text-sky-500 mt-auto">Configurer →</div>
    </button>
  )
}
