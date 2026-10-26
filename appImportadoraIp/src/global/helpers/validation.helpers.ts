// validation.helpers · utilitarios puros de sanitización y validación estricta
// conecta con: ValidatedInput, ValidatedNumberInput y formularios de clientes, productos y traslados

export const SANITIZERS = {
    // Elimina espacios al inicio, al final y colapsa espacios dobles o múltiples internos
    trim: (str: string): string => str.trim().replace(/\s+/g, ' '),

    // Remueve cualquier carácter que no sea un dígito numérico [0-9]
    numericOnly: (str: string): string => str.replace(/\D/g, ''),

    // Asegura formato de número positivo con un único punto decimal
    positiveDecimal: (str: string): string => {
        const cleaned = str.replace(/[^\d.]/g, '')
        const parts = cleaned.split('.')
        if (parts.length <= 1) return cleaned
        return `${parts[0]}.${parts.slice(1).join('')}`
    },

    // Convierte a mayúsculas limpias sin caracteres especiales
    cleanCode: (str: string): string => str.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, ''),
}

export const VALIDATORS = {
    // Valida longitud y bloquea repeticiones infinitas (ej. "aaaaa" o "pedrooooooasd")
    isValidName: (str: string, min = 3, max = 60): { valid: boolean; error?: string } => {
        const trimmed = str.trim()
        if (trimmed.length < min) return { valid: false, error: `Debe tener al menos ${min} caracteres` }
        if (trimmed.length > max) return { valid: false, error: `No puede superar ${max} caracteres` }
        if (/(.)\1{4,}/i.test(trimmed)) {
            return { valid: false, error: 'Contiene repeticiones de caracteres no válidas' }
        }
        return { valid: true }
    },

    // Formato estricto de correo electrónico
    isValidEmail: (str: string): { valid: boolean; error?: string } => {
        const trimmed = str.trim()
        if (!trimmed) return { valid: false, error: 'El correo electrónico es obligatorio' }
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/
        if (!emailRegex.test(trimmed)) {
            return { valid: false, error: 'Ingresa un formato de correo válido (ej. usuario@empresa.com)' }
        }
        return { valid: true }
    },

    // Celular colombiano: exactamente 10 dígitos iniciando en 3
    isValidPhone: (str: string): { valid: boolean; error?: string } => {
        const digits = str.replace(/\D/g, '')
        if (digits.length === 0) return { valid: false, error: 'El número de teléfono es obligatorio' }
        if (digits.length !== 10 || !digits.startsWith('3')) {
            return { valid: false, error: 'Debe ser un celular válido de 10 dígitos (ej. 3001234567)' }
        }
        return { valid: true }
    },

    // Documento de identidad (Cédula o NIT): 6 a 15 dígitos alfanuméricos
    isValidDocument: (str: string): { valid: boolean; error?: string } => {
        const cleaned = str.trim().replace(/[^a-zA-Z0-9-]/g, '')
        if (cleaned.length < 6 || cleaned.length > 15) {
            return { valid: false, error: 'El documento debe tener entre 6 y 15 dígitos' }
        }
        return { valid: true }
    },

    // Número positivo mayor que cero
    isPositiveNumber: (num: number | string): { valid: boolean; error?: string } => {
        const parsed = typeof num === 'string' ? parseFloat(num) : num
        if (isNaN(parsed) || parsed <= 0) {
            return { valid: false, error: 'Debe ser un valor numérico positivo mayor a cero' }
        }
        return { valid: true }
    },

    // Cantidad entera positiva contra stock físico disponible
    isValidQuantity: (num: number | string, maxStock?: number): { valid: boolean; error?: string } => {
        const parsed = typeof num === 'string' ? parseInt(num, 10) : num
        if (isNaN(parsed) || parsed <= 0) {
            return { valid: false, error: 'La cantidad debe ser mayor a 0' }
        }
        if (maxStock !== undefined && parsed > maxStock) {
            return { valid: false, error: `Supera el stock físico disponible (${maxStock} uds)` }
        }
        return { valid: true }
    },
}
