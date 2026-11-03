// useDocSeriesForm · formulario de una serie de consecutivos: el prefijo y el próximo número
// conecta con: DocSeriesPanel (lo usa), billing.rules (validación y vista del número), billing.thunks (saveDocSeriesThunk), billing.selectors y navigation (cierra el panel)
// ojo: cambiar el próximo número hacia atrás puede repetir consecutivos ya usados: el panel lo avisa; el API valida otra vez
import { useState } from 'react'
import { closeDrawerForm } from '@/features/navigation'
import { toast } from '@/global/helpers/feedback/toast'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { nextNumberLabel, seriesProblem } from '../helpers/billing.rules'
import { selectBilling } from '../selectors/billing.selectors'
import { saveDocSeriesThunk } from '../thunks/billing.thunks'
import type { DocSeries } from '../types/billing.types'

export const useDocSeriesForm = (series: DocSeries) => {
  const dispatch = useAppDispatch()
  const { saving } = useAppSelector(selectBilling)
  const [prefix, setPrefix] = useState(series.prefix)
  const [next, setNext] = useState(String(series.nextNumber))
  const [error, setError] = useState<string | null>(null)

  const nextNumber = Number(next)
  const problem = seriesProblem(prefix, nextNumber)
  const goesBack = Number.isInteger(nextNumber) && nextNumber < series.nextNumber

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (problem || saving) return
    setError(null)
    const result = await dispatch(saveDocSeriesThunk({ seriesId: series.id, prefix: prefix.trim(), nextNumber }))
    if (saveDocSeriesThunk.fulfilled.match(result)) {
      toast.success('Serie guardada')
      dispatch(closeDrawerForm())
    } else {
      setError(result.payload ?? 'No se pudo guardar la serie.')
    }
  }

  return { prefix, setPrefix, next, setNext, preview: problem ? '—' : nextNumberLabel(prefix.trim(), nextNumber), goesBack, problem, saving, error, submit, cancel: () => dispatch(closeDrawerForm()) }
}
