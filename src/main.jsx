import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import '@fontsource/permanent-marker'
import './index.css'
import App from './App'

// En desarrollo: si el panel (/admin/) guardó el catálogo, las pestañas de la web se recargan para mostrarlo.
if (import.meta.hot) {
  import.meta.hot.on('conejo:catalogo', () => window.location.reload())
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
