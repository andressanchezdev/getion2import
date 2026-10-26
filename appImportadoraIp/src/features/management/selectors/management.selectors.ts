// management.selectors · lecturas del estado de pedidos por etapa
// conecta con: PipelineScreen y useManagementLoader; leen state.management
import type { ManagementState } from '../types/management.types'

type ManagementRootState = { management: ManagementState }

export const selectManagement = (state: ManagementRootState) => state.management
