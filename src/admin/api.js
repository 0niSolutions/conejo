// Comunicación con la API del panel y utilidades de fotos.
//
// - Publicado: la API es el Worker de Cloudflare (worker/index.js). Cloudflare Access pide el mail
//   antes de dejar entrar, y cada "Guardar" es un commit en GitHub que vuelve a publicar la web.
// - Con `npm run dev`: la API es admin-api.js, que escribe directo en los archivos del proyecto.

const MAX_SIDE = 1400
const QUALITY = 0.82

export const LOCAL = import.meta.env.DEV
export const SESSION_EXPIRED = 'conejo:sesion-vencida'
// Cierra la sesión de Cloudflare Access.
export const LOGOUT_URL = '/cdn-cgi/access/logout'

async function request(path, options = {}) {
  let response
  try {
    response = await fetch(`/api/admin${path}`, { ...options, redirect: 'manual', headers: { 'X-Conejo-Admin': '1', ...options.headers } })
  } catch {
    throw new Error(LOCAL ? 'No hay conexión con el panel. ¿Sigue corriendo `npm run dev`?' : 'No hay conexión. Revisá internet y probá de nuevo.')
  }
  // Si la sesión de Access venció, Cloudflare responde con una redirección a su pantalla de login.
  const expired = response.type === 'opaqueredirect' || response.status === 401
  if (expired) window.dispatchEvent(new Event(SESSION_EXPIRED))
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(expired ? 'Tu sesión venció. Recargá la página para volver a entrar.' : (data.error ?? `El servidor respondió ${response.status}.`))
    error.status = response.status
    throw error
  }
  return data
}

export const getSession = () => request('/session')

// Versión del catálogo que se cargó. Al guardar se manda, y si alguien guardó otra cosa en el medio,
// la API no lo pisa.
let version = null

// Fotos subidas en esta sesión que todavía no se guardaron: ruta -> { blob, url }.
// `blob` es el identificador de la foto en GitHub (null en local) y `url` la vista previa en el navegador.
const pending = new Map()

export async function loadCatalog() {
  const data = await request('/catalog')
  version = data.version
  return data.catalog
}

export async function saveCatalog(catalog) {
  const uploads = Object.fromEntries([...pending].filter(([, item]) => item.blob).map(([path, item]) => [path, item.blob]))
  const data = await request('/catalog', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ catalog, version, uploads }),
  })
  version = data.version
  return data
}

// Dirección para mostrar una foto en el panel. Las recién subidas se ven desde el navegador, y las
// ya guardadas que todavía no se publicaron (el deploy tarda un par de minutos) se piden a la API.
export const photoSrc = (path) => pending.get(path)?.url ?? path
export const videoSrc = photoSrc

export function photoFallback(event, path) {
  const img = event.currentTarget
  if (LOCAL || img.dataset.fallback) return
  img.dataset.fallback = '1'
  img.src = `/api/admin/photos/${path.split('/').pop()}`
}

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
  const data = await request(`/photos?name=${encodeURIComponent(slugify(name))}`, {
    method: 'POST',
    headers: { 'Content-Type': 'image/webp' },
    body: blob,
  })
  pending.set(data.path, { blob: data.blob, url: URL.createObjectURL(blob) })
  return data.path
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

// Video de "Sobre mí": se sube tal cual (MP4). Hasta 20 MB.
export const MAX_VIDEO_MB = 20

export async function uploadVideo(file, name) {
  if (file.type !== 'video/mp4') throw new Error(`"${file.name}" no es un video MP4.`)
  if (file.size > MAX_VIDEO_MB * 1024 * 1024) throw new Error(`El video pesa ${(file.size / 1024 / 1024).toFixed(1)} MB y el máximo es ${MAX_VIDEO_MB} MB. Comprimilo y probá de nuevo.`)
  const data = await request(`/videos?name=${encodeURIComponent(slugify(name))}`, {
    method: 'POST',
    headers: { 'Content-Type': 'video/mp4' },
    body: file,
  })
  pending.set(data.path, { blob: data.blob, url: URL.createObjectURL(file) })
  return data.path
}

export function videoFallback(event, path) {
  const video = event.currentTarget
  if (LOCAL || video.dataset.fallback) return
  video.dataset.fallback = '1'
  video.src = `/api/admin/videos/${path.split('/').pop()}`
}
