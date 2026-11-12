// copyToClipboard · copia cualquier texto al portapapeles con respaldo execCommand y notificación toast
import { toast } from '@/global/helpers/feedback/toast'

export const copyToClipboard = async (text: string, label: string = 'Código'): Promise<boolean> => {
  if (!text) return false

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} copiado: ${text}`)
      return true
    }
  } catch {
    // Intento con fallback execCommand
  }

  try {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.opacity = '0'
    textArea.style.left = '-9999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    const successful = document.execCommand('copy')
    document.body.removeChild(textArea)

    if (successful) {
      toast.success(`${label} copiado: ${text}`)
      return true
    }
  } catch {
    // Falló fallback
  }

  toast.error(`No se pudo copiar el ${label.toLowerCase()}.`)
  return false
}

export default copyToClipboard

