// useSelectedCustomerData · cuando se abre un cliente pide su detalle, sus direcciones y sus descuentos
// conecta con: CustomerDrawer (lo usa al montarse); despacha customers.thunks y customers.details.thunks
import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { selectOpenCustomerId } from '../selectors/customers.selectors'
import { loadCustomerDetailThunk } from '../thunks/customers.thunks'
import { loadDirectionsThunk, loadDiscountsThunk } from '../thunks/customers.details.thunks'

export const useSelectedCustomerData = (): void => {
  const dispatch = useAppDispatch()
  const customerId = useAppSelector(selectOpenCustomerId)

  useEffect(() => {
    if (customerId === null) return
    dispatch(loadCustomerDetailThunk(customerId))
    dispatch(loadDirectionsThunk(customerId))
    dispatch(loadDiscountsThunk(customerId))
  }, [dispatch, customerId])
}
