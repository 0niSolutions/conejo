// Worker de Cloudflare: sirve la web (los archivos de dist/) y la API del panel en /api/admin.
//
// Solo los pedidos a /api/* pasan por este código (ver run_worker_first en wrangler.jsonc).
// Todo lo demás lo sirve Cloudflare directo desde dist/, sin gastar ejecuciones del Worker.
//
// Configuración (Workers & Pages → conejo → Settings → Variables and Secrets):
//   GITHUB_TOKEN        secreto. Token de GitHub con "Contents: Read and write" solo sobre este repo.
//   ACCESS_TEAM_DOMAIN  ej. conejo.cloudflareaccess.com (Zero Trust → Settings → Custom pages / Team domain).
//   ACCESS_AUD          el "Application Audience (AUD) Tag" de la aplicación de Access del panel.
//   ADMIN_EMAILS        mails que pueden usar el panel, separados por coma (los mismos que en Access).
// GITHUB_REPO y GITHUB_BRANCH están en wrangler.jsonc.

import { AccessError, verifyAccess } from './access.js'
import { MAX_CATALOG_BYTES, MAX_PHOTO_BYTES, MAX_VIDEO_BYTES, isMp4, isWebp, photoFileName, validateCatalog, videoFileName } from './catalog-rules.js'
import { GitHubError, readCatalog, readPhoto, readVideo, saveCatalog, uploadBlob } from './github.js'

class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

const SECURITY_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
}

function reply(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...SECURITY_HEADERS, 'Content-Type': 'application/json; charset=utf-8' } })
}

async function readBody(request, limit) {
  const declared = Number(request.headers.get('Content-Length'))
  if (declared > limit) throw new HttpError(413, 'El archivo es demasiado grande.')
  const bytes = new Uint8Array(await request.arrayBuffer())
  if (bytes.length > limit) throw new HttpError(413, 'El archivo es demasiado grande.')
  return bytes
}

async function handle(request, env, url) {
  // Fotos ya guardadas en el repo pero todavía no publicadas: las pide un <img>, que no puede mandar
  // headers propios. Es solo lectura, así que alcanza con la sesión de Access.
  const photo = request.method === 'GET' && url.pathname.match(/^\/api\/admin\/photos\/([^/]+)$/)
  if (photo) {
    await verifyAccess(request, env)
    const file = await readPhoto(env, photo[1])
    return new Response(file.body, {
      headers: { ...SECURITY_HEADERS, 'Content-Type': 'image/webp', 'Cache-Control': 'private, max-age=600' },
    })
  }
  const video = request.method === 'GET' && url.pathname.match(/^\/api\/admin\/videos\/([^/]+)$/)
  if (video) {
    await verifyAccess(request, env)
    const file = await readVideo(env, video[1])
    return new Response(file.body, {
      headers: { ...SECURITY_HEADERS, 'Content-Type': 'video/mp4', 'Cache-Control': 'private, max-age=600' },
    })
  }

  // Un header propio obliga al navegador a pedir permiso antes de un pedido desde otro sitio (y este
  // Worker nunca lo da), así ninguna página abierta en otra pestaña puede usar la sesión del panel.
  if (request.headers.get('X-Conejo-Admin') !== '1') throw new HttpError(403, 'Pedido no permitido.')
  const origin = request.headers.get('Origin')
  if (origin && origin !== url.origin) throw new HttpError(403, 'Pedido no permitido.')

  const email = await verifyAccess(request, env)
  const route = `${request.method} ${url.pathname.replace(/^\/api\/admin/, '')}`

  if (route === 'GET /session') return { authenticated: true, user: email }

  if (route === 'GET /catalog') return readCatalog(env)

  if (route === 'PUT /catalog') {
    let data
    try {
      data = JSON.parse(new TextDecoder().decode(await readBody(request, MAX_CATALOG_BYTES)))
    } catch (error) {
      throw error instanceof HttpError ? error : new HttpError(400, 'El catálogo no es un JSON válido.')
    }
    const { catalog, version, uploads } = data ?? {}
    try {
      validateCatalog(catalog)
    } catch (error) {
      throw new HttpError(400, error.message)
    }
    if (version !== null && version !== undefined && typeof version !== 'string') throw new HttpError(400, 'Pedido inválido.')
    if (uploads !== undefined && (typeof uploads !== 'object' || uploads === null || Array.isArray(uploads))) throw new HttpError(400, 'Pedido inválido.')
    const result = await saveCatalog(env, { catalog, version, uploads, author: email })
    return { catalog, ...result }
  }

  if (route === 'POST /photos') {
    if (request.headers.get('Content-Type') !== 'image/webp') throw new HttpError(415, 'La foto tiene que llegar en formato WebP.')
    const bytes = await readBody(request, MAX_PHOTO_BYTES)
    if (!isWebp(bytes)) throw new HttpError(415, 'El archivo no es una imagen WebP.')
    const blob = await uploadBlob(env, bytes)
    return { path: `/productos/${photoFileName(url.searchParams.get('name'))}`, blob }
  }

  if (route === 'POST /videos') {
    if (request.headers.get('Content-Type') !== 'video/mp4') throw new HttpError(415, 'El video tiene que ser MP4.')
    const bytes = await readBody(request, MAX_VIDEO_BYTES)
    if (!isMp4(bytes)) throw new HttpError(415, 'El archivo no es un video MP4.')
    const blob = await uploadBlob(env, bytes)
    return { path: `/videos/${videoFileName(url.searchParams.get('name'))}`, blob }
  }

  throw new HttpError(404, 'No existe esa ruta.')
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (!url.pathname.startsWith('/api/admin/')) return reply({ error: 'No existe esa ruta.' }, 404)
    try {
      const result = await handle(request, env, url)
      return result instanceof Response ? result : reply(result)
    } catch (error) {
      const known = error instanceof HttpError || error instanceof AccessError || error instanceof GitHubError
      if (!known) console.error('[panel]', error?.stack ?? error)
      return reply({ error: known ? error.message : 'Error del servidor. Mirá los logs del Worker en Cloudflare.' }, known ? error.status : 500)
    }
  },
}
