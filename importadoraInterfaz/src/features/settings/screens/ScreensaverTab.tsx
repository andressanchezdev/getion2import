// ScreensaverTab · imagen central del protector de pantalla: vista de la activa y carga de una nueva (se comprime en el navegador)
// conecta con: SettingsScreen (pestaña «protector») y useScreensaverSettings (estado, validación y guardado); no habla con el API
import React from 'react'
import { useScreensaverSettings } from '../hooks/useScreensaverSettings'
import './ScreensaverTab.css'

export const ScreensaverTab: React.FC = () => {
  const s = useScreensaverSettings()
  return (
    <div className="screensaver-tab-container">
      <div className="screensaver-header-bar">
        <div>
          <h4>Protector de Pantalla</h4>
          <p>Personaliza y gestiona la imagen central que se dibuja mediante partículas interactivas.</p>
        </div>
      </div>

      <div className="screensaver-grid">
        <div className="screensaver-card">
          <div className="screensaver-card-header">
            <h5>Imagen Activa en el Protector</h5>
            <span className={s.currentImage ? 'screensaver-badge-active' : 'screensaver-badge-new'}>
              {s.currentImage ? 'En Uso' : '⚠ Sin imagen configurada'}
            </span>
          </div>
          <div className="screensaver-preview-box">
            {s.loading ? (
              <div className="screensaver-loading">Cargando imagen actual...</div>
            ) : s.currentImage ? (
              <img src={s.currentImage} alt="Logo Actual del Protector" className="screensaver-preview-img" />
            ) : (
              <div className="screensaver-loading">⚠ El protector está desactivado hasta que se configure una imagen.</div>
            )}
          </div>
          <div className="screensaver-card-meta">
            <small>Esta imagen se guarda en la base de datos y se proyecta en todos los equipos de la compañía.</small>
          </div>
        </div>

        <div className="screensaver-card">
          <div className="screensaver-card-header">
            <h5>Actualizar o Subir Nueva Imagen</h5>
            {s.newImage && <span className="screensaver-badge-new">Optimizada y Lista</span>}
          </div>
          <div className="screensaver-upload-area">
            <input
              type="file"
              id="screensaver-file-input"
              accept="image/png, image/jpeg, image/webp"
              onChange={(e) => { const file = e.target.files?.[0]; if (file) s.pickFile(file) }}
              className="screensaver-file-hidden"
              disabled={s.optimizing}
            />
            <label htmlFor="screensaver-file-input" className="screensaver-dropzone">
              <span className="screensaver-drop-icon">📁</span>
              <strong>{s.optimizing ? 'Optimizando imagen...' : 'Haz clic o arrastra una nueva imagen'}</strong>
              <small>Formatos recomendados: PNG o JPG con fondo oscuro o transparente (compresión automática WebP)</small>
              {s.fileName && <span className="screensaver-selected-file">Archivo: {s.fileName}</span>}
              {s.info && <span className="screensaver-opt-tag">{s.info}</span>}
            </label>
          </div>
          {s.newImage && (
            <div className="screensaver-new-preview-box">
              <span className="screensaver-new-preview-label">Vista Previa Comprimida:</span>
              <img src={s.newImage} alt="Nueva Vista Previa" className="screensaver-preview-img" />
            </div>
          )}
          <div className="screensaver-actions">
            <button type="button" className="screensaver-btn-restore" onClick={s.restoreDefault} disabled={s.saving || s.loading || s.optimizing}>
              Restaurar Original
            </button>
            <button type="button" className="screensaver-btn-save" onClick={s.save} disabled={s.saving || !s.newImage || s.optimizing}>
              {s.saving ? 'Guardando...' : 'Completar y Guardar Imagen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
export default ScreensaverTab
