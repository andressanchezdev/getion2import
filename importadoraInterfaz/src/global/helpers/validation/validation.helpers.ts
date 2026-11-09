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

    // Teléfono colombiano: solo dígitos y a lo sumo 10 (celular de 10 dígitos o fijo de 7 u 10)
    phoneCO: (str: string): string => str.replace(/\D/g, '').slice(0, 10),

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

// ---- mensajes de problema para formularios con campos opcionales (devuelven null si está bien o vacío y no es obligatorio) ----

// teléfono colombiano: celular de 10 dígitos que empieza en 3, fijo de 7 dígitos o fijo de 10 con indicativo 60X
export const phoneProblem = (value: string, required = false): string | null => {
    const digits = value.replace(/\D/g, '')
    if (digits === '') return required ? 'El teléfono es obligatorio.' : null
    const mobile = digits.length === 10 && digits.startsWith('3')
    const landline10 = digits.length === 10 && digits.startsWith('60')
    const landline7 = digits.length === 7 && !digits.startsWith('0')
    return mobile || landline10 || landline7 ? null : 'Teléfono no válido: celular de 10 dígitos (3001234567), fijo de 7 o fijo con indicativo (6012345678).'
}

// correo electrónico con formato válido
export const emailProblem = (value: string, required = false): string | null => {
    if (value.trim() === '') return required ? 'El correo es obligatorio.' : null
    return VALIDATORS.isValidEmail(value).valid ? null : 'Correo no válido (ej. usuario@empresa.com).'
}

// entero dentro de un rango (días de plazo, porcentajes, rangos de numeración); vacío es válido salvo que sea obligatorio
export const integerProblem = (value: string | number, label: string, min: number, max: number, required = false): string | null => {
    const text = String(value).trim()
    if (text === '') return required ? `${label} es obligatorio.` : null
    const n = Number(text)
    if (!Number.isInteger(n) || n < min || n > max) return `${label} debe ser un número entero entre ${min} y ${max}.`
    return null
}
