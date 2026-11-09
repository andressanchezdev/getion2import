// BankRecordsTable · tabla de los movimientos leídos del PDF del banco: fecha, descripción, canal, referencia, valor, estado y acciones (confirmar contra un pago o ignorar)
// conecta con: BankReconciliationScreen (la usa), RowActions (acciones con íconos de línea), Pill (estado), ConfirmDialog (ignorar), useBankActions y navigation (abre el panel de confirmar)
// ojo: solo las entradas pendientes tienen acciones; las salidas se ven atenuadas porque no se concilian; la paginación es la del servidor (la pinta la pantalla)
import React, { useState } from 'react'
import { ReasonPrompt } from '@/features/reasonPrompt'
import { Pill, type PillTone } from '@/global/components/UI/atoms/Pill'
import { RowActions } from '@/global/components/UI/molecules/table/RowActions'
import { formatPesos } from '@/global/helpers/formatting/format'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { usePermissions } from '@/global/hooks/access/usePermissions'
import { openDrawerForm } from '@/features/navigation'
import checkIcon from '@/assets/icons/check.svg?raw'
import banIcon from '@/assets/icons/ban.svg?raw'
import { STATUS_LABELS } from '../../helpers/bank.adapter'
import { useBankActions } from '../../hooks/useBankActions'
import type { BankRecord, BankRecordStatus } from '../../types/bank.types'
import { DataTable } from '@/global/components/UI/molecules/table/DataTable'

const STATUS_TONE: Record<BankRecordStatus, PillTone> = { pending: 'amber', confirmed: 'green', ignored: 'gray' }

interface Props {
  records: BankRecord[]
  message: string | null // lo que se dice en lugar de las filas (cargando, error o nada que mostrar)
}

export const BankRecordsTable: React.FC<Props> = ({ records, message }) => {
  const dispatch = useAppDispatch()
  const canEdit = usePermissions().canPerformAction('wallet', 'bankReconciliation', 'update')
  const actions = useBankActions()
  const [toIgnore, setToIgnore] = useState<BankRecord | null>(null)

  const confirmIgnore = async (reason: string) => {
    const target = toIgnore
    setToIgnore(null)
    if (target) await actions.ignore(target.id, reason)
  }

  return (
    <>
      <DataTable tableId="bank-bank-records">
          <thead>
            <tr>
              <th className="col-priority-medium">Fecha</th>
              <th className="col-priority-high">Descripción</th>
              <th className="col-priority-low">Canal</th>
              <th className="col-priority-low">Referencia</th>
              <th className="bank-num col-priority-high">Valor</th>
              <th className="col-priority-high">Estado</th>
              <th className="col-actions">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {message ? (
              <tr>
                <td colSpan={7} className="bank-message">
                  <p>{message}</p>
                </td>
              </tr>
            ) : (
              records.map((record) => (
                <tr key={record.id} className={record.isIncome ? '' : 'bank-row-outgoing'}>
                  <td className="col-priority-medium">{record.date || '—'}</td>
                  <td className="bank-description col-priority-high">{record.description || '—'}</td>
                  <td className="col-priority-low">{record.channel || '—'}</td>
                  <td className="col-priority-low">{record.reference || '—'}</td>
                  <td className="bank-num table-amount col-priority-high">
                    {record.isIncome ? '' : '−'}
                    {formatPesos(record.amount)}
                  </td>
                  <td className="col-priority-high">{record.isIncome ? <Pill tone={STATUS_TONE[record.status]}>{STATUS_LABELS[record.status]}</Pill> : <Pill tone="gray">Salida</Pill>}</td>
                  <td className="col-actions">
                    <RowActions
                      actions={[
                        {
                          key: 'confirm',
                          label: 'Confirmar la entrada y ligarla a un pago',
                          icon: checkIcon,
                          tone: 'success',
                          visible: canEdit && record.isIncome && record.status === 'pending',
                          onClick: () => dispatch(openDrawerForm({ kind: 'bankConfirm', payload: record })),
                        },
                        {
                          key: 'ignore',
                          label: 'Ignorar: no corresponde a ningún pago',
                          icon: banIcon,
                          tone: 'danger',
                          visible: canEdit && record.status === 'pending',
                          onClick: () => setToIgnore(record),
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </DataTable>

      <ReasonPrompt
        open={toIgnore !== null}
        title="Ignorar movimiento"
        message={`¿Ignorar el movimiento de ${toIgnore ? formatPesos(toIgnore.amount) : ''}? Quedará marcado como que no corresponde a ningún pago; indica el motivo.`}
        confirmLabel="Ignorar"
        onConfirm={confirmIgnore}
        onCancel={() => setToIgnore(null)}
      />
    </>
  )
}

export default BankRecordsTable
