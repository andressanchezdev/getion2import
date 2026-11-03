// ReturnsScreen · historial de devoluciones y garantías: KPIs, una tarjeta con barra de filtros y tabla, y el drawer para crear
// conecta con: useReturnsList (datos y filtros) y los componentes de la feature; no habla con el API
import React, { useState } from 'react'
import { CreateReturnDrawer } from '../components/CreateReturnDrawer'
import { ReturnsKpis } from '../components/ReturnsKpis'
import { ReturnsTable } from '../components/ReturnsTable'
import { ReturnsToolbar } from '../components/ReturnsToolbar'
import { useReturnsList } from '../hooks/useReturnsList'
import './ReturnsScreen.css'

export const ReturnsScreen: React.FC = () => {
  const list = useReturnsList()
  const [drawerOpen, setDrawerOpen] = useState(false)
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
          onCreate={() => setDrawerOpen(true)}
        />
        <ReturnsTable
          rows={list.visible}
          loading={list.loading}
          resetKey={`${list.query}|${list.status}|${list.warehouseId}`}
          onApprove={list.approve}
          onReject={list.reject}
        />
      </div>
      <CreateReturnDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  )
}
export default ReturnsScreen
