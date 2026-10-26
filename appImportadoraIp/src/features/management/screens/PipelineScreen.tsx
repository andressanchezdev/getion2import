// PipelineScreen · pantalla de Gestión Caja > Facturación Caja: cuántos pedidos hay en cada etapa y, para la etapa elegida, cómo se reparten por canal
// conecta con: management.selectors/slice (datos y etapa), useManagementLoader (los pide), global StatCard; la monta MainContent (screenRegistry)
// ojo: los conteos salen de POST /management y, al elegir un canal con pedidos, la lista sale de POST /management/saleOrders (solo consulta; verificar o asignar un pedido son escrituras y no se hacen aquí)
import React from 'react'
import './PipelineScreen.css'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { useManagementLoader } from '../hooks/useManagementLoader'
import { selectManagement } from '../selectors/management.selectors'
import { selectChannel, selectStage } from '../slices/management.slice'
import { StageOrders } from '../components/StageOrders'
import { LISTABLE_STAGES } from '../constants/management.constants'
import { loadPipelineThunk } from '../thunks/management.thunks'

const number = new Intl.NumberFormat('es-CO')

export const PipelineScreen: React.FC = () => {
  const dispatch = useAppDispatch()
  const { selected, channel, data, status, error } = useAppSelector(selectManagement)
  useManagementLoader()

  if (status === 'failed' && !data) {
    return (
      <div className="pipeline-message" role="alert">
        <p className="pipeline-message-text">{error}</p>
        <button type="button" className="pipeline-retry" onClick={() => dispatch(loadPipelineThunk())}>
          Reintentar
        </button>
      </div>
    )
  }
  if (!data) return <div className="pipeline-message">Cargando pedidos por etapa…</div>

  const current = data.stages.find((stage) => stage.key === selected)
  const listable = LISTABLE_STAGES.includes(selected)
  return (
    <div className="pipeline-screen">
      <div className="pipeline-stages" role="tablist" aria-label="Etapas del pedido">
        {data.stages.map((stage) => (
          <button key={stage.key} type="button" role="tab" aria-selected={stage.key === selected} className={`pipeline-stage ${stage.key === selected ? 'pipeline-stage-active' : ''}`} onClick={() => dispatch(selectStage(stage.key))}>
            <span className="pipeline-stage-count">{number.format(stage.count)}</span>
            <span className="pipeline-stage-label">{stage.label}</span>
          </button>
        ))}
      </div>

      <section className="pipeline-section" aria-busy={status === 'loading'}>
        <h3 className="pipeline-title">
          {current?.label}: desglose por canal {status === 'failed' && <span className="pipeline-stale">(no se pudo actualizar)</span>}
        </h3>
        <div className="pipeline-grid">
          {data.channels.map((item) =>
            listable && item.count > 0 ? (
              <button key={item.key} type="button" aria-pressed={item.key === channel} className={`pipeline-card pipeline-card-button ${item.key === channel ? 'pipeline-card-active' : ''}`} onClick={() => dispatch(selectChannel(item.key === channel ? null : item.key))}>
                <span className="pipeline-card-count">{number.format(item.count)}</span>
                <span className="pipeline-card-label">{item.label} · ver pedidos</span>
              </button>
            ) : (
              <div key={item.key} className="pipeline-card">
                <span className="pipeline-card-count">{number.format(item.count)}</span>
                <span className="pipeline-card-label">{item.label}</span>
              </div>
            )
          )}
        </div>
      </section>

      {listable && channel && <StageOrders />}

      <section className="pipeline-section">
        <h3 className="pipeline-title">Otros contadores</h3>
        <div className="pipeline-grid">
          {data.extras.map((extra) => (
            <div key={extra.key} className="pipeline-card">
              <span className="pipeline-card-count">{number.format(extra.count)}</span>
              <span className="pipeline-card-label">{extra.label}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default PipelineScreen
