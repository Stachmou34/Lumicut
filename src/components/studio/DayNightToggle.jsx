import { motion } from 'framer-motion'
import { useConfiguratorStore } from '../../store/configuratorStore'

export default function DayNightToggle() {
  const { dayNight, setDayNight } = useConfiguratorStore()
  const isNight = dayNight === 'night'

  return (
    <div className="flex items-center gap-1 bg-slate-800 rounded-full p-1 border border-slate-700">
      <button
        onClick={() => setDayNight('day')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${!isNight ? 'bg-amber-100 text-amber-900 shadow' : 'text-slate-500 hover:text-slate-300'}`}
      >
        ☀️ Jour
      </button>
      <button
        onClick={() => setDayNight('night')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${isNight ? 'bg-slate-700 text-slate-200 shadow' : 'text-slate-500 hover:text-slate-300'}`}
      >
        🌙 Nuit
      </button>
    </div>
  )
}
