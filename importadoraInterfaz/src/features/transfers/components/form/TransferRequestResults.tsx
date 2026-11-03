// TransferRequestResults · lo que pasó al enviar el pedido: un renglón por bodega de origen con el serial del traslado creado o el motivo del fallo
// conecta con: CreateTransferForm (la pinta) y transfers.types (TransferRequestResult)
import React from 'react'
import type { TransferRequestResult } from '../../types/transfers.types'

// resultado por bodega de origen
export const TransferRequestResults: React.FC<{ results: TransferRequestResult[] }> = ({ results }) => (
  <ul className="transfer-req-results-list">
    {results.map((result) => (
      <li key={result.originWarehouseId} className={`transfer-req-outcome ${result.error ? 'transfer-req-outcome-error' : 'transfer-req-outcome-ok'}`}>
        <strong>{result.originWarehouseName}</strong>
        <span>{result.transfer ? `Traslado #${result.transfer.serialCode} creado: la bodega debe despacharlo.` : result.error}</span>
      </li>
    ))}
  </ul>
)

export default TransferRequestResults
