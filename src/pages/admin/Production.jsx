import KanbanBoard from '../../components/admin/KanbanBoard'

// Page de production — kanban en 4 étapes avec drag & drop
export default function Production() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-1">File de production</h1>
      <p className="text-gray-400 text-sm mb-6">
        Glissez les commandes d'une colonne à l'autre pour mettre à jour l'avancement.
      </p>
      <KanbanBoard />
    </div>
  )
}
