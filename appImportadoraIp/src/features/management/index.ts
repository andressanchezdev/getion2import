// management/index · API pública de la feature management (pedidos por etapa de Gestión Caja)
// conecta con: rootReducer (reducer) y screenRegistry (PipelineScreen)
export * from './types/management.types'
export * from './types/management.api.types'
export * from './selectors/management.selectors'
export * from './slices/management.slice'
export * from './thunks/management.thunks'
export * from './hooks/useManagementLoader'
export * from './hooks/useStageOrdersLoader'
export * from './screens/PipelineScreen'
