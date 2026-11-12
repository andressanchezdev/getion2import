// CopyableCell · celda copiable al clic con apariencia de texto y parada de propagación para no accionar la fila
import React from 'react'
import { copyToClipboard } from '@/global/helpers/clipboard/copyToClipboard'
import './CopyableCell.css'

interface CopyableCellProps {
  text: string | number
  label?: string
  prefix?: string
  display?: React.ReactNode
  className?: string
  children?: React.ReactNode
}

export const CopyableCell: React.FC<CopyableCellProps> = ({
  text,
  label = 'Código',
  prefix,
  display,
  className = '',
  children,
}) => {
  const strValue = String(text ?? '')
  const content = children ?? display ?? (prefix ? `${prefix}${strValue}` : strValue)

  if (!strValue || strValue === '—') {
    return <span className={className}>{content}</span>
  }

  const handleCopy = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation()
    void copyToClipboard(strValue, label)
  }

  return (
    <button
      type="button"
      className={`copyable-cell ${className}`.trim()}
      title="Clic para copiar"
      onClick={handleCopy}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleCopy(e)
        }
      }}
    >
      {content}
    </button>
  )
}

export default CopyableCell
