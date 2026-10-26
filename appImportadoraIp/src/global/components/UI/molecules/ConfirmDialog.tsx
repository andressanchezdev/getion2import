// ConfirmDialog · diálogo de confirmación reutilizable (título, mensaje y botones Cancelar / Confirmar)
// conecta con: SideMenuUser (confirmar el cierre de sesión); usa useEscapeKey de global/hooks; no sabe qué acción confirma
// ojo: el foco empieza en "Cancelar" (la opción segura), Tab no sale del diálogo (con dos botones) y al cerrar el foco vuelve al botón que lo abrió
import React, { useEffect, useId, useRef } from 'react'
import { useEscapeKey } from '@/global/hooks/useEscapeKey'
import './ConfirmDialog.css'

export interface ConfirmDialogProps {
    open: boolean
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    confirmDisabled?: boolean // deshabilita "Confirmar" (por ejemplo mientras falta el motivo)
    children?: React.ReactNode // contenido extra bajo el mensaje, como un campo de texto
    onConfirm: () => void
    onCancel: () => void
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    open,
    title,
    message,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    confirmDisabled = false,
    children,
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
        // con contenido extra (un campo de texto) el foco recorre el diálogo con el orden normal del navegador
        if (event.key !== 'Tab' || children) return
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
