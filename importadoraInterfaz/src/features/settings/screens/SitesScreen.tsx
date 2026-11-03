// SitesScreen · Configuración > Sedes: el administrador ve las sedes de su compañía; el superadmin ve la lista de compañías y, de cada una, sus sedes
// conecta con: usePermissions (nivel del usuario), features/warehouses (WarehousesScreen) y features/companies (CompaniesScreen); la monta MainContent (screenRegistry)
// ojo: el nombre del menú también cambia por nivel (accessLevels: «Compañías» para el superadmin)
import React from 'react'
import { CompaniesScreen } from '@/features/companies'
import { WarehousesScreen } from '@/features/warehouses'
import { usePermissions } from '@/global/hooks/access/usePermissions'

export const SitesScreen: React.FC = () => {
  const { level } = usePermissions()
  return level === 'superadmin' ? <CompaniesScreen /> : <WarehousesScreen />
}

export default SitesScreen
