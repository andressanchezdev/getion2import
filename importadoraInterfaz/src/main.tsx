// main · punto de entrada: monta la app en el #root del index.html
// conecta con: index.html (el script apunta aquí), App.tsx y App.css
import React from 'react'
import { createRoot } from 'react-dom/client'
import './App.css'
import App from './App'

// ojo: este montaje antes estaba dentro de App.tsx, se separó para que App sea solo el componente
const rootElement = document.getElementById('root')
if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}
