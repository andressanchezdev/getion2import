// cash.selectors · lecturas del turno de caja: el turno, su estado de carga y si hay un cambio en curso
// conecta con: useCashSession y los hooks de caja; leen state.cash
import type { CashState } from '../types/cash.types'

// forma mínima del state (así la feature no importa el store de app)
type CashRootState = { cash: CashState }

export const selectCash = (state: CashRootState) => state.cash
