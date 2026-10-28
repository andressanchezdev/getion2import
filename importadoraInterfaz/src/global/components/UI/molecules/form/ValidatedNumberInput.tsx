// ValidatedNumberInput · input numérico blindado contra teclas inválidas ('e', 'E', '-', '+')
// conecta con: validation.helpers, cobros de caja, cantidades de stock y formularios de precios
import React from 'react'
import './FormInputs.css'

export interface ValidatedNumberInputProps {
    id?: string
    name?: string
    label?: string
    value: number | string
    onChange: (value: string) => void
    onBlur?: () => void
    min?: number
    max?: number
    step?: number | string
    placeholder?: string
    error?: string
    required?: boolean
    disabled?: boolean
    allowDecimals?: boolean
    prefix?: string
    suffix?: string
    helperText?: string
}

export const ValidatedNumberInput: React.FC<ValidatedNumberInputProps> = ({
    id,
    name,
    label,
    value,
    onChange,
    onBlur,
    min = 0,
    max,
    step = '1',
    placeholder,
    error,
    required = false,
    disabled = false,
    allowDecimals = false,
    prefix,
    suffix,
    helperText,
}) => {
    // Interceptor de teclado estricto: bloquea 'e', 'E', '+', '-' y comas
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const forbiddenKeys = ['e', 'E', '+', '-']
        if (!allowDecimals) {
            forbiddenKeys.push('.', ',')
        }
        if (forbiddenKeys.includes(e.key)) {
            e.preventDefault()
        }
        // Bloquea múltiples puntos decimales
        if (allowDecimals && (e.key === '.' || e.key === ',') && String(value).includes('.')) {
            e.preventDefault()
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let raw = e.target.value.replace(',', '.')
        if (!allowDecimals) {
            raw = raw.replace(/\D/g, '')
        }
        if (max !== undefined && raw !== '' && parseFloat(raw) > max) {
            raw = String(max)
        }
        onChange(raw)
    }

    return (
        <div className="form-field-group">
            {label && (
                <div className="form-field-header">
                    <label htmlFor={id} className="form-field-label">
                        {label}
                        {required && <span className="form-field-required">*</span>}
                    </label>
                </div>
            )}

            <div className="form-input-wrapper">
                {prefix && <span className="form-input-affix">{prefix}</span>}
                <input
                    id={id}
                    name={name}
                    type="text"
                    inputMode={allowDecimals ? 'decimal' : 'numeric'}
                    value={value}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onBlur={onBlur}
                    placeholder={placeholder}
                    disabled={disabled}
                    min={min}
                    step={step}
                    className={`form-input-control ${error ? 'form-input-error' : ''}`}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? `${id}-error` : helperText ? `${id}-help` : undefined}
                />
                {suffix && <span className="form-input-affix">{suffix}</span>}
            </div>

            {error ? (
                <span id={`${id}-error`} className="form-field-error-msg" role="alert">
                    {error}
                </span>
            ) : helperText ? (
                <span id={`${id}-help`} className="form-field-helper-msg">
                    {helperText}
                </span>
            ) : null}
        </div>
    )
}

export default ValidatedNumberInput
