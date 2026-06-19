import CategorySelector from './CategorySelector.jsx'
import SaludRepo from './SaludRepo.jsx'

// Resultado del análisis de la IA: bloque de Salud del repo (solo lectura)
// + las categorías accionables (delegadas a CategorySelector).
export default function AnalysisPanel({
  analisis,
  seleccionadas,
  onToggle,
  onAtacar,
  idiomaRepo,
  onCambiarIdioma,
  onAnalisisProfundo,
  modo,
  cargando,
}) {
  if (!analisis) return null

  return (
    <div className="space-y-4">
      {/* Salud del repositorio (solo lectura) */}
      <SaludRepo datos={analisis.salud_repo} />

      {/* Categorías accionables */}
      <CategorySelector
        analisis={analisis}
        seleccionadas={seleccionadas}
        onToggle={onToggle}
        onAtacar={onAtacar}
        idiomaRepo={idiomaRepo}
        onCambiarIdioma={onCambiarIdioma}
        onAnalisisProfundo={onAnalisisProfundo}
        modo={modo}
        cargando={cargando}
      />
    </div>
  )
}
