// CatalogsScreen · pantalla de Gestión Inventario > Marcas y Categorías: consulta de marcas, categorías y modelos de moto con búsqueda y conteo
// conecta con: catalogs.selectors (listas y estados), useLoadCatalogs (las pide), global SearchBar; la monta MainContent (screenRegistry)
// ojo: no se muestran los logos de las marcas: el backend manda rutas relativas (dependencias/img/marcas/...) sin servidor, que no cargarían
// ojo: solo consulta: crear y editar (POST /brands/register, /categories/register, /models/register y sus update) están declarados pero sin probar contra el backend. La búsqueda se hace en pantalla sobre la lista completa
import React, { useState } from 'react'
import './CatalogsScreen.css'
import { useAppSelector } from '@/global/hooks/useRedux'
import { SearchBar } from '@/global/components/UI/molecules/SearchBar'
import { useLoadCatalogs } from '../hooks/useLoadCatalogs'
import { selectBrands, selectBrandsStatus, selectCategories, selectCategoriesStatus, selectMotoModels, selectMotoModelsStatus } from '../selectors/catalogs.selectors'

type Tab = 'brands' | 'categories' | 'models'

const TABS: ReadonlyArray<{ id: Tab; label: string }> = [
  { id: 'brands', label: 'Marcas' },
  { id: 'categories', label: 'Categorías' },
  { id: 'models', label: 'Modelos de moto' },
]

export const CatalogsScreen: React.FC = () => {
  useLoadCatalogs()
  const [tab, setTab] = useState<Tab>('brands')
  const [query, setQuery] = useState('')
  const brands = useAppSelector(selectBrands)
  const categories = useAppSelector(selectCategories)
  const models = useAppSelector(selectMotoModels)
  const statuses = { brands: useAppSelector(selectBrandsStatus), categories: useAppSelector(selectCategoriesStatus), models: useAppSelector(selectMotoModelsStatus) }

  const lists = { brands, categories, models }
  const needle = query.trim().toLowerCase()
  const rows = lists[tab].filter((row) => !needle || row.name.toLowerCase().includes(needle))
  const status = statuses[tab]

  return (
    <div className="catalogs-screen">
      <div className="catalogs-card">
        <div className="catalogs-toolbar">
          <div className="catalogs-tabs" role="tablist">
            {TABS.map((item) => (
              <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className={`catalogs-tab ${tab === item.id ? 'catalogs-tab-active' : ''}`} onClick={() => setTab(item.id)}>
                {item.label} <span className="catalogs-count">{lists[item.id].length}</span>
              </button>
            ))}
          </div>
          <SearchBar value={query} onChange={setQuery} placeholder="Buscar por nombre..." className="catalogs-search" />
        </div>

        {status === 'failed' ? (
          <p className="catalogs-message" role="alert">
            No se pudo cargar este catálogo. Recarga la página para intentarlo de nuevo.
          </p>
        ) : rows.length === 0 ? (
          <p className="catalogs-message">{status === 'succeeded' ? 'Ningún registro coincide con la búsqueda.' : 'Cargando…'}</p>
        ) : (
          <ul className="catalogs-list">
            {rows.map((row) => (
              <li key={row.id} className="catalogs-item">
                <span className="catalogs-name">{row.name}</span>
                <span className="catalogs-id">#{row.id}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default CatalogsScreen
