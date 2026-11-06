import catalog from './catalog.json'

export const INSTAGRAM_URL = 'https://www.instagram.com/conejo.08/'
export const WHATSAPP_URL = 'https://wa.me/5493875269754'
export const ONI_URL = 'https://www.onisolutions.com.ar/'

export const NAV_LINKS = [
  { id: 'inicio', label: 'Inicio', href: '#inicio' },
  { id: 'sobre-mi', label: 'Sobre mí', href: '#sobre-mi' },
  { id: 'productos', label: 'Productos', href: '#/productos' },
  { id: 'redes', label: 'Redes', href: '#redes' },
]

// Dibujo para las líneas creadas desde el panel, que no tienen uno propio.
export const DEFAULT_ART = {
  lines: ['M35 75H165L175 170Q176 180 165 180H35Q24 180 25 170Z', 'M70 75Q70 25 100 25Q130 25 130 75'],
  stitch: 'M42 84H158L166 172H34Z',
}

// El catálogo se edita desde el panel (`npm run dev` y abrir #/admin), que escribe en `catalog.json`
// y guarda las fotos en `public/productos/`. El orden de los arrays es el orden en la web.
export const PRODUCTS = catalog.lines.map(({ slug, name, text, photo, art }) => ({
  slug,
  name,
  text,
  photo,
  lines: (art ?? DEFAULT_ART).lines,
  stitch: (art ?? DEFAULT_ART).stitch,
}))

// Los productos ocultos no llegan a la web. `photos[0]` es la foto principal.
export const CATALOG = catalog.products
  .filter((product) => !product.hidden)
  .map(({ id, line, name, text, price, photos, soldOut }) => ({ id, tag: line, name, text, price, photos, soldOut }))

export const STATS = [
  { value: 1015, label: 'seguidores en Instagram' },
  { value: PRODUCTS.length, label: 'líneas de productos' },
  { value: 24, suffix: '/7', label: 'atención, todos los días' },
]

export function formatPrice(value) {
  return value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
}
