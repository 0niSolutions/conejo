// Reglas del catálogo, compartidas por la API local (admin-api.js, con `npm run dev`)
// y por el Worker de Cloudflare (worker/index.js). Sin dependencias de Node ni del navegador.

export const CATALOG_PATH = 'src/catalog.json'
export const PHOTOS_DIR = 'public/productos'
// Las fotos del panel se llaman "nombre-1a2b3c4d.webp" y se sirven en /productos/.
export const PHOTO_PATH = /^\/productos\/([a-z0-9-]+-[a-f0-9]{8}\.webp)$/
export const PHOTO_FILE = /^[a-z0-9-]+-[a-f0-9]{8}\.webp$/
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024
export const MAX_CATALOG_BYTES = 2 * 1024 * 1024

const isText = (value) => typeof value === 'string' && value.trim() !== ''
const isSlug = (value) => typeof value === 'string' && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value)
const isPhoto = (value) => typeof value === 'string' && PHOTO_PATH.test(value)

// Tira un Error con un mensaje para mostrar en el panel si el catálogo no es válido.
export function validateCatalog(catalog) {
  const fail = (message) => {
    throw new Error(message)
  }
  if (!catalog || !Array.isArray(catalog.lines) || !Array.isArray(catalog.products)) fail('El catálogo no tiene el formato esperado.')

  const slugs = new Set()
  for (const line of catalog.lines) {
    if (!isSlug(line.slug) || slugs.has(line.slug)) fail(`La línea "${line.name}" tiene un identificador inválido o repetido.`)
    if (!isText(line.name)) fail('Hay una línea sin nombre.')
    if (typeof line.text !== 'string') fail(`La línea "${line.name}" no tiene descripción.`)
    if (line.photo !== null && !isPhoto(line.photo)) fail(`La foto de la línea "${line.name}" no es válida.`)
    slugs.add(line.slug)
  }

  const ids = new Set()
  for (const product of catalog.products) {
    if (!isSlug(product.id) || ids.has(product.id)) fail(`El producto "${product.name}" tiene un identificador inválido o repetido.`)
    if (!isText(product.name)) fail('Hay un producto sin nombre.')
    if (!slugs.has(product.line)) fail(`El producto "${product.name}" no pertenece a ninguna línea.`)
    if (typeof product.text !== 'string') fail(`El producto "${product.name}" no tiene descripción.`)
    if (!Number.isInteger(product.price) || product.price < 0) fail(`El precio de "${product.name}" no es válido.`)
    if (!Array.isArray(product.photos) || !product.photos.every(isPhoto)) fail(`Las fotos de "${product.name}" no son válidas.`)
    if (typeof product.hidden !== 'boolean' || typeof product.soldOut !== 'boolean') fail(`Faltan datos de "${product.name}".`)
    ids.add(product.id)
  }

  // Destacados: ids de productos, en el orden en que se ven en el inicio.
  if (!Array.isArray(catalog.featured)) fail('Falta la lista de destacados.')
  const featured = new Set()
  for (const id of catalog.featured) {
    if (!ids.has(id)) fail('Hay un destacado que no corresponde a ningún producto.')
    if (featured.has(id)) fail('Hay un producto repetido en destacados.')
    featured.add(id)
  }
}

// Todas las fotos que usa el catálogo, como "/productos/archivo.webp".
export function usedPhotos(catalog) {
  return new Set([...catalog.lines.map((line) => line.photo), ...catalog.products.flatMap((product) => product.photos)].filter(Boolean))
}

export const formatCatalog = (catalog) => JSON.stringify(catalog, null, 2) + '\n'

export const isWebp = (bytes) =>
  bytes.length > 12 &&
  String.fromCharCode(...bytes.subarray(0, 4)) === 'RIFF' &&
  String.fromCharCode(...bytes.subarray(8, 12)) === 'WEBP'

// "Mochila Roja" -> "mochila-roja-1a2b3c4d.webp"
export function photoFileName(name) {
  const base = (name ?? '').match(/[a-z0-9]+/g)?.join('-').slice(0, 40) || 'foto'
  const random = [...crypto.getRandomValues(new Uint8Array(4))].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${base}-${random}.webp`
}
