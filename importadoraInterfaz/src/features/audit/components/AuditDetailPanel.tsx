// AuditDetailPanel · detalle completo (solo lectura) de un movimiento, en el panel derecho: quién, cuándo, desde dónde, qué cambió y el JSON original
// conecta con: formRegistry (lo muestra), audit.types y AuditScreen.css (clases audit-*)
import React from 'react'
import type { AuditEntry } from '../types/audit.types'
import { formatAuditDate } from '../helpers/audit.format'

interface AuditDetailPanelProps {
  entry: AuditEntry
}

export const AuditDetailPanel: React.FC<AuditDetailPanelProps> = ({ entry }) => {
  const facts: Array<[string, string]> = [
    ['Fecha', formatAuditDate(entry.createdAt)],
    ['Gestión', entry.entityLabel],
    ['Registro', entry.entityId ? `#${entry.entityId}` : '—'],
    ['Acción', entry.actionLabel],
    ['Quién', entry.actorLabel],
    ['Compañía', entry.companyId ? `#${entry.companyId}` : '—'],
    ['Dirección IP', entry.ipAddress || '—'],
    ['Navegador', entry.userAgent || '—'],
  ]

  return (
    <div className="audit-panel">
        <div className="audit-panel-body">
          <dl className="audit-facts">
            {facts.map(([label, value]) => (
              <div key={label} className="audit-fact">
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>

          {entry.reason && <p className="audit-reason"><strong>Motivo:</strong> {entry.reason}</p>}

          <h4 className="audit-subtitle">Qué cambió</h4>
          {entry.changes.length === 0 ? (
            <p className="audit-muted">Este movimiento no guardó detalle de cambios.</p>
          ) : (
            <table className="audit-table">
              <thead>
                <tr><th>Campo</th><th>Antes</th><th>Después</th></tr>
              </thead>
              <tbody>
                {entry.changes.map((row) => (
                  <tr key={row.field}>
                    <td>{row.field}</td>
                    <td>{row.before || '—'}</td>
                    <td>{row.after || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {entry.rawChanges && (
            <>
              <h4 className="audit-subtitle">Registro original</h4>
              <pre className="audit-raw">{entry.rawChanges}</pre>
            </>
          )}
        </div>
    </div>
  )
}
