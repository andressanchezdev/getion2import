// ReturnsScreen · historial de devoluciones y garantías: KPIs, una tarjeta con barra de filtros y tabla, y el drawer para crear
// conecta con: useReturnsList (datos y filtros) y los componentes de la feature; no habla con el API
import React, { useState } from 'react'
import { usePermissions } from '@/global/hooks/access/usePermissions'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { openDrawerForm } from '@/features/navigation'
import { ReasonPrompt } from '@/features/reasonPrompt'
import { ReturnsKpis } from '../components/ReturnsKpis'
import { ReturnsTable } from '../components/ReturnsTable'
import { ReturnsToolbar } from '../components/ReturnsToolbar'
import { useReturnsList } from '../hooks/useReturnsList'
import type { ReturnDto } from '../types/returns.types'
import './ReturnsScreen.css'

export const ReturnsScreen: React.FC = () => {
  const dispatch = useAppDispatch()
  const canCreate = usePermissions().can('returns:create')
  const list = useReturnsList()
  // rechazar pide el motivo (se abre el formulario en el panel derecho)
  const [toReject, setToReject] = useState<ReturnDto | null>(null)
  return (
    <div className="returns-screen-container">
      <ReturnsKpis counts={list.counts} />
      <div className="returns-table-card">
        <ReturnsToolbar
          query={list.query}
          status={list.status}
          warehouseId={list.warehouseId}
          counts={list.counts}
          hasFilters={list.hasFilters}
          onQuery={list.setQuery}
          onStatus={list.setStatus}
          onWarehouse={list.setWarehouse}
          onClear={list.clearFilters}
          onCreate={canCreate ? () => dispatch(openDrawerForm({ kind: 'createReturn' })) : undefined}
        />
        <ReturnsTable
          rows={list.visible}
          loading={list.loading}
          resetKey={`${list.query}|${list.status}|${list.warehouseId}`}
          onApprove={list.approve}
          onReject={setToReject}
        />
      </div>
      <ReasonPrompt
        open={toReject !== null}
        title={`Rechazar el caso #${toReject?.id ?? ''}`}
        message="La solicitud quedará rechazada. Indica el motivo para dejar constancia."
        confirmLabel="Rechazar"
        onConfirm={(reason) => {
          const target = toReject
          setToReject(null)
          if (target) void list.reject(target, reason)
        }}
        onCancel={() => setToReject(null)}
      />
    </div>
  )
}
export default ReturnsScreen
