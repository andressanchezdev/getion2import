// ValidatedInput · input de texto blindado con sanitización y límite de caracteres
// conecta con: validation.helpers, formularios de clientes, productos y traslados
import React from 'react'
import './FormInputs.css'

export interface ValidatedInputProps {
    id?: string
    name?: string
    label?: string
    value: string
    onChange: (value: string) => void
    onBlur?: () => void
    maxLength?: number
    placeholder?: string
    error?: string
    required?: boolean
    disabled?: boolean
    type?: 'text' | 'email' | 'tel' | 'password'
    sanitize?: (val: string) => string
    showCharCount?: boolean
    helperText?: string
    autoComplete?: string
}

export const ValidatedInput: React.FC<ValidatedInputProps> = ({
    id,
    name,
    label,
    value,
    onChange,
    onBlur,
    maxLength = 60,
    placeholder,
    error,
    required = false,
    disabled = false,
    type = 'text',
    sanitize,
    showCharCount = true,
    helperText,
    autoComplete,
}) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let next = e.target.value
        if (maxLength && next.length > maxLength) {
            next = next.slice(0, maxLength)
        }
        if (sanitize) {
            next = sanitize(next)
        }
        onChange(next)
    }

    const currentLen = (value || '').length
    const isNearLimit = maxLength ? currentLen >= maxLength * 0.9 : false

    return (
        <div className="form-field-group">
            {(label || (showCharCount && maxLength)) && (
                <div className="form-field-header">
                    {label && (
                        <label htmlFor={id} className="form-field-label">
                            {label}
                            {required && <span className="form-field-required">*</span>}
                        </label>
                    )}
                    {showCharCount && maxLength && (
                        <span className={`form-field-counter ${isNearLimit ? 'form-field-counter-warning' : ''}`}>
                            {currentLen}/{maxLength}
                        </span>
                    )}
                </div>
            )}

            <div className="form-input-wrapper">
                <input
                    id={id}
                    name={name}
                    type={type}
                    value={value}
                    onChange={handleChange}
                    onBlur={onBlur}
                    maxLength={maxLength}
                    placeholder={placeholder}
                    disabled={disabled}
                    autoComplete={autoComplete}
                    className={`form-input-control ${error ? 'form-input-error' : ''}`}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? `${id}-error` : helperText ? `${id}-help` : undefined}
                />
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

export default ValidatedInput
