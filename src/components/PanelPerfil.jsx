import { useMemo } from 'react'
import PerfilUsuario from './PerfilUsuario.jsx'
import StatsContribuciones from './StatsContribuciones.jsx'
import LogrosBadges from './LogrosBadges.jsx'
import { calcularStats, calcularLogros } from '../utils/logros.js'

// Panel "Mi perfil": identidad de quien se logueó + estadísticas de sus
// contribuciones + logros desbloqueados. Full-width, encima de la configuración.
export default function PanelPerfil({ usuario, contribuciones = [] }) {
  const stats = useMemo(() => calcularStats(contribuciones), [contribuciones])
  const logros = useMemo(() => calcularLogros(stats), [stats])

  return (
    <section className="rounded-lg border border-white/[0.08] bg-[#0e0f11] p-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04),0_1px_2px_0_rgba(0,0,0,0.3)]">
      <div className="grid gap-5 md:grid-cols-3 md:divide-x md:divide-white/[0.06]">
        <div className="md:pr-5">
          <PerfilUsuario usuario={usuario} />
        </div>
        <div className="md:px-5">
          <StatsContribuciones stats={stats} />
        </div>
        <div className="md:pl-5">
          <LogrosBadges logros={logros} />
        </div>
      </div>
    </section>
  )
}
