// StockTable · tabla de existencias de la bodega activa: una fila por producto y ubicación con físico, reservado, vendible y nivel
// conecta con: StockScreen (la usa), Pill (nivel y distintivo de varias ubicaciones) e inventory.constants (textos del nivel); recibe filas, mensajes y conteos ya calculados por useStockTable
// ojo: si un producto está en dos o más ubicaciones con unidades se ve en filas independientes y con el distintivo «Presente en N ubicaciones» (su total va en el título); el pie suma las filas que se ven
import React from 'react'
import '../InventoryTables.css'
import { Pill, type PillTone } from '@/global/components/UI/atoms/Pill'
import { STOCK_LEVEL_LABEL } from '../../constants/inventory.constants'
import type { InventoryStockRow, StockLevel } from '../../types/inventory.types'
import { DataTable } from '@/global/components/UI/molecules/table/DataTable'
import { CopyableCell } from '@/global/components/UI/molecules/table/CopyableCell'

const LEVEL_TONE: Record<StockLevel, PillTone> = { out: 'red', low: 'amber', ok: 'green' }

interface Props {
  rows: InventoryStockRow[]
  message: string | null // lo que se dice en lugar de las filas (cargando, error o nada que mostrar)
  locationCounts: Map<number, number>
  productSums: Map<number, { available: number; sellable: number }>
  totals: { available: number; reserved: number; sellable: number }
}

export const StockTable: React.FC<Props> = ({ rows, message, locationCounts, productSums, totals }) => (
  <DataTable tableId="inventory-stock">
      <thead>
        <tr>
          <th>Código</th>
          <th>Producto</th>
          <th>Marca</th>
          <th>Categoría</th>
          <th>Ubicación</th>
          <th className="inv-num">Físico</th>
          <th className="inv-num">Reservado</th>
          <th className="inv-num">Vendible</th>
          <th>Nivel</th>
        </tr>
      </thead>
      <tbody>
        {message ? (
          <tr>
            <td colSpan={9} className="inv-message">
              <p>{message}</p>
            </td>
          </tr>
        ) : (
          rows.map((row) => {
            const places = locationCounts.get(row.productId) ?? 0
            const sum = productSums.get(row.productId)
            return (
              <tr key={row.id}>
                <td>
                  <CopyableCell text={row.productCode} />
                </td>
                <td className="inv-name">
                  {row.productName}
                  {places > 1 && (
                    <>
                      {' '}
                      <span title={`Total del producto en la bodega: ${sum?.available ?? 0} físico, ${sum?.sellable ?? 0} vendible`}>
                        <Pill tone="blue">Presente en {places} ubicaciones</Pill>
                      </span>
                    </>
                  )}
                </td>
                <td>{row.brand || '—'}</td>
                <td>{row.category || '—'}</td>
                <td>
                  <span className="inv-loc">{row.location || 'Sin ubicación'}</span>
                </td>
                <td className="inv-num table-amount">{row.available}</td>
                <td className="inv-num table-amount">{row.reserved}</td>
                <td className="inv-num table-amount">{row.sellable}</td>
                <td>
                  <Pill tone={LEVEL_TONE[row.level]}>{STOCK_LEVEL_LABEL[row.level]}</Pill>
                </td>
              </tr>
            )
          })
        )}
      </tbody>
      {!message && (
        <tfoot>
          <tr className="inv-total-row">
            <td colSpan={5}>Total de las filas que se ven</td>
            <td className="inv-num table-amount">{totals.available}</td>
            <td className="inv-num table-amount">{totals.reserved}</td>
            <td className="inv-num table-amount">{totals.sellable}</td>
            <td />
          </tr>
        </tfoot>
      )}
    </DataTable>
)

export default StockTable
