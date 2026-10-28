// AppToaster · contenedor de las alertas flotantes (notificaciones arriba al centro)
// conecta con: App.tsx (se monta una sola vez) y global/helpers/toast (desde ahí se disparan)
// ojo: misma configuración que Grandma's Liquors (sonner 2.0.3: top-center, richColors, closeButton); sonner trae sus propios estilos, no usa tokens
import { Toaster } from 'sonner'

export const AppToaster = () => <Toaster richColors position="top-center" closeButton />

export default AppToaster
