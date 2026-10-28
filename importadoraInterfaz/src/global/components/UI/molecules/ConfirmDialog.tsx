// ConfirmDialog · diálogo de confirmación reutilizable (título, mensaje y botones Cancelar / Confirmar)
// conecta con: SideMenuUser (confirmar el cierre de sesión); usa useEscapeKey de global/hooks; no sabe qué acción confirma
// ojo: el foco empieza en "Cancelar" (la opción segura), Tab no sale del diálogo y al cerrar el foco vuelve al botón que lo abrió
import React, { useEffect, useId, useRef } from 'react'
import { useEscapeKey } from '@/global/hooks/useEscapeKey'
import './ConfirmDialog.css'

export interface ConfirmDialogProps {
    open: boolean
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    // ojo: contenido extra bajo el mensaje (ej. el motivo de una anulación) y confirmar inactivo hasta que esté completo
    children?: React.ReactNode
    confirmDisabled?: boolean
    onConfirm: () => void
    onCancel: () => void
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    open,
    title,
    message,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    children,
    confirmDisabled = false,
    onConfirm,
    onCancel,
}) => {
    const titleId = useId()
    const cancelRef = useRef<HTMLButtonElement>(null)
    const confirmRef = useRef<HTMLButtonElement>(null)

    // Esc cancela, igual que el clic en el fondo
    useEscapeKey(onCancel, open)

    // al abrir: guarda quién tenía el foco y lo pasa a "Cancelar"; al cerrar se lo devuelve
    useEffect(() => {
        if (!open) return
        const previous = document.activeElement as HTMLElement | null
        cancelRef.current?.focus()
        return () => previous?.focus()
    }, [open])

    // con solo dos botones, Tab y Shift+Tab alternan entre ellos (el foco no se escapa al resto de la página)
    const handleKeyDown = (event: React.KeyboardEvent) => {
        if (event.key !== 'Tab') return
        const goingBack = event.shiftKey
        const active = document.activeElement
        if (goingBack && active === cancelRef.current) {
            event.preventDefault()
            confirmRef.current?.focus()
        } else if (!goingBack && active === confirmRef.current) {
            event.preventDefault()
            cancelRef.current?.focus()
        }
    }

    if (!open) return null

    return (
        <div className="confirm-dialog-overlay" onClick={onCancel}>
            <div
                className="confirm-dialog-card"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby={titleId}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={handleKeyDown}
            >
                <h4 id={titleId} className="confirm-dialog-title">
                    {title}
                </h4>
                <p className="confirm-dialog-message">{message}</p>
                {children}
                <div className="confirm-dialog-actions">
                    <button ref={cancelRef} type="button" className="confirm-dialog-btn-cancel" onClick={onCancel}>
                        {cancelLabel}
                    </button>
                    <button ref={confirmRef} type="button" className="confirm-dialog-btn-confirm" onClick={onConfirm} disabled={confirmDisabled}>
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ConfirmDialog
