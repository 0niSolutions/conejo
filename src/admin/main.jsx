import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import '@fontsource/permanent-marker'
import '../index.css'
import Admin from './Admin'

// Página del panel (/admin/). Va separada de la web: su código no se descarga en el sitio público,
// y en Cloudflare queda detrás de Access.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Admin />
  </StrictMode>,
)
