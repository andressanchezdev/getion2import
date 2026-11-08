// useQuotationCartMenuActions · opciones del menú ☰ del carrito de cotización (en el encabezado del panel derecho): vaciarlo
// conecta con: DrawerRight (las muestra en DrawerHeader) y quotationDraft.slice (clearDraft)
import { useMemo } from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import type { DrawerMenuAction } from '@/global/types/drawerMenu.types'
import { clearDraft } from '../slices/quotationDraft.slice'
import { selectDraftLines } from '../selectors/quotationDraft.selectors'

export const useQuotationCartMenuActions = (): DrawerMenuAction[] => {
  const dispatch = useAppDispatch()
  const isEmpty = useAppSelector(selectDraftLines).length === 0
  return useMemo(() => [{ key: 'clear', label: 'Vaciar cotización', danger: true, disabled: isEmpty, onClick: () => dispatch(clearDraft()) }], [isEmpty, dispatch])
}
