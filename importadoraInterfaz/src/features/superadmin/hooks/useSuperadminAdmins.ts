// useSuperadminAdmins · pide los administradores con los filtros del estado y expone lo que la pantalla necesita (lista, filtros, empresas y acciones)
// conecta con: SuperadminAdminsScreen; despacha superadmin.thunks y lee superadmin.slice, superadmin.selectors y la lista de compañías (companies)
// ojo: cada cambio de filtro o de página vuelve a pedir la lista al servidor
import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { useCompanies } from '@/features/companies'
import { clearAdminFilters, setAdminCompany, setAdminPage, setAdminQuery, setAdminStatus } from '../slices/superadmin.slice'
import { selectHasAdminFilters, selectSuperadmin } from '../selectors/superadmin.selectors'
import { loadAdminsThunk, toggleAdminStatusThunk } from '../thunks/superadmin.thunks'
import type { AdminStatusFilter, AdminUser } from '../types/superadmin.types'

export const useSuperadminAdmins = () => {
  const dispatch = useAppDispatch()
  const { items, loading, meta, filters } = useAppSelector(selectSuperadmin)
  const hasFilters = useAppSelector(selectHasAdminFilters)
  const { companies } = useCompanies(true)

  useEffect(() => {
    dispatch(loadAdminsThunk())
  }, [dispatch, filters])

  return {
    admins: items, loading, meta, filters, hasFilters, companies,
    setQuery: useCallback((value: string) => dispatch(setAdminQuery(value)), [dispatch]),
    setCompany: useCallback((id: number | null) => dispatch(setAdminCompany(id)), [dispatch]),
    setStatus: useCallback((value: AdminStatusFilter) => dispatch(setAdminStatus(value)), [dispatch]),
    setPage: useCallback((page: number) => dispatch(setAdminPage(page)), [dispatch]),
    clearFilters: useCallback(() => dispatch(clearAdminFilters()), [dispatch]),
    toggle: useCallback((admin: AdminUser, reason?: string) => dispatch(toggleAdminStatusThunk({ admin, reason })), [dispatch]),
  }
}
