// CashClosedBanner · aviso fijo de «caja cerrada»: hay que abrir el turno antes de recibir pagos en efectivo
// conecta con: CashRegisterScreen (y luego el cobro de ventas) lo pinta; recibe de useCashSession si está cerrada y qué hacer para abrirla
// ojo: no aparece mientras se consulta ni si hubo error de lectura (ahí se muestra el error, no «cerrada»)
import React from 'react'
import './CashClosedBanner.css'

interface Props {
  warehouseName: string
  onOpen?: () => void // si llega, se ofrece el botón para abrir el turno
}

export const CashClosedBanner: React.FC<Props> = ({ warehouseName, onOpen }) => (
  <div className="cash-closed-banner" role="alert">
    <p>
      <strong>Caja cerrada{warehouseName ? ` en ${warehouseName}` : ''}.</strong> Abre el turno antes de recibir pagos en efectivo.
    </p>
    {onOpen && (
      <button type="button" className="btn-primary" onClick={onOpen}>
        Abrir turno
      </button>
    )}
  </div>
)

export default CashClosedBanner
