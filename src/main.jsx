import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import '@fontsource/permanent-marker'
import './index.css'
import App from './App'

// En desarrollo: si el panel guardó el catálogo, las pestañas de la web se recargan para mostrarlo.
// La del panel no se recarga mientras se usa, sino al salir de él.
if (import.meta.hot) {
  const onAdmin = () => window.location.hash.startsWith('#/admin')
  let stale = false
  import.meta.hot.on('conejo:catalogo', () => {
    if (onAdmin()) stale = true
    else window.location.reload()
  })
  window.addEventListener('hashchange', () => {
    if (stale && !onAdmin()) window.location.reload()
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
