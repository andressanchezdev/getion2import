// useAsyncValidation · hook de validación asíncrona en tiempo real (debounce 500ms): ¿ya existe este correo o este documento?
// conecta con: los formularios que lo usan (CreateCustomerModal); quien lo usa le pasa la función que consulta (así global no importa de las features)
// ojo: antes llamaba a POST /customers/check-email y POST /users/validate-document; la API en Go no tiene esas rutas, la consulta la define cada feature
import { useState, useRef, useCallback } from 'react'
import { VALIDATORS } from '@/global/helpers/validation/validation.helpers'

// responde true si ya existe un registro con ese valor
export type ExistsCheck = (field: 'document' | 'email', value: string) => Promise<boolean>

export const useAsyncValidation = (exists: ExistsCheck) => {
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  const [isCheckingDoc, setIsCheckingDoc] = useState(false)
  const [emailAsyncError, setEmailAsyncError] = useState<string | null>(null)
  const [docAsyncError, setDocAsyncError] = useState<string | null>(null)

  const emailTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const docTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const validateEmailDebounced = useCallback(
    (email: string) => {
      if (emailTimer.current) clearTimeout(emailTimer.current)
      setEmailAsyncError(null)

      if (!email || !VALIDATORS.isValidEmail(email)) return

      emailTimer.current = setTimeout(async () => {
        try {
          setIsCheckingEmail(true)
          if (await exists('email', email)) setEmailAsyncError('Este correo ya se encuentra registrado para esta empresa.')
        } catch {
          // si la consulta falla no se bloquea el formulario: la API vuelve a validar al guardar
        } finally {
          setIsCheckingEmail(false)
        }
      }, 500)
    },
    [exists]
  )

  const validateDocumentDebounced = useCallback(
    (documentNumber: string) => {
      if (docTimer.current) clearTimeout(docTimer.current)
      setDocAsyncError(null)

      if (!documentNumber || documentNumber.length < 6) return

      docTimer.current = setTimeout(async () => {
        try {
          setIsCheckingDoc(true)
          if (await exists('document', documentNumber)) setDocAsyncError('El documento de identidad ya se encuentra registrado en el sistema.')
        } catch {
          // si la consulta falla no se bloquea el formulario: la API vuelve a validar al guardar
        } finally {
          setIsCheckingDoc(false)
        }
      }, 500)
    },
    [exists]
  )

  return {
    isCheckingEmail,
    isCheckingDoc,
    emailAsyncError,
    docAsyncError,
    validateEmailDebounced,
    validateDocumentDebounced,
    resetAsyncErrors: () => {
      setEmailAsyncError(null)
      setDocAsyncError(null)
    },
  }
}

export default useAsyncValidation
