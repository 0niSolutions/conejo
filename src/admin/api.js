// Comunicación con la API local del panel (admin-api.js) y utilidades de fotos.

const MAX_SIDE = 1400
const QUALITY = 0.82

async function request(path, options = {}) {
  let response
  try {
    response = await fetch(`/api/admin${path}`, { ...options, headers: { 'X-Conejo-Admin': '1', ...options.headers } })
  } catch {
    throw new Error('No hay conexión con el panel. ¿Sigue corriendo `npm run dev`?')
  }
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error ?? `El servidor respondió ${response.status}.`)
  return data
}

export const loadCatalog = () => request('/catalog')

export const saveCatalog = (catalog) =>
  request('/catalog', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(catalog) })

// Achica la foto a 1400 px del lado más largo y la pasa a WebP antes de subirla.
async function compress(file) {
  if (!file.type.startsWith('image/')) throw new Error(`"${file.name}" no es una imagen.`)
  let bitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error(`No se pudo abrir "${file.name}". Probá con una foto JPG, PNG o WebP.`)
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', QUALITY))
  if (blob?.type !== 'image/webp') throw new Error('Este navegador no puede convertir fotos a WebP. Usá Chrome, Edge o Firefox.')
  return blob
}

export async function uploadPhoto(file, name) {
  const blob = await compress(file)
  const { path } = await request(`/photos?name=${encodeURIComponent(slugify(name))}`, {
    method: 'POST',
    headers: { 'Content-Type': 'image/webp' },
    body: blob,
  })
  return path
}

export function slugify(text) {
  return (
    text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'item'
  )
}

export function uniqueSlug(text, taken) {
  const base = slugify(text)
  let slug = base
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`
  return slug
}

// Acepta "45000", "45.000" o "$ 45.000" y devuelve el número, o null si no es un precio.
export function parsePrice(value) {
  const digits = String(value).replace(/[\s$.]/g, '')
  return /^\d{1,9}$/.test(digits) ? Number(digits) : null
}

export function matches(text, query) {
  const clean = (value) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  return clean(text).includes(clean(query.trim()))
}
