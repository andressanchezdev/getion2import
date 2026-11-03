// useCustomerExists · devuelve la función que pregunta si ya existe un cliente con ese documento o correo, lista para useAsyncValidation
// conecta con: CreateCustomerForm y EditCustomerForm (lo usan), customers.thunks (customerExistsThunk) y global useAsyncValidation (recibe la función)
import { useCallback } from 'react'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import type { ExistsCheck } from '@/global/hooks/data/useAsyncValidation'
import { customerExistsThunk } from '../thunks/customers.thunks'

export const useCustomerExists = (): ExistsCheck => {
  const dispatch = useAppDispatch()
  return useCallback((field, value) => dispatch(customerExistsThunk({ field, value })).unwrap(), [dispatch])
}
