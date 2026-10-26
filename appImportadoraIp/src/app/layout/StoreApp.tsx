// StoreApp · raíz de la app con el store de redux: pone el Provider y la puerta de entrada (login o ERP)
// conecta con: app/store (store) y AuthGate
import { Provider } from 'react-redux'
import { store } from '@/app/store/store'
import { AuthGate } from './AuthGate'

export function StoreApp() {
  return (
    <Provider store={store}>
      <AuthGate />
    </Provider>
  )
}

export default StoreApp
