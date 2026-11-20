import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CATALOG_PATH,
  MAX_CATALOG_BYTES,
  MAX_PHOTO_BYTES,
  PHOTOS_DIR,
  PHOTO_FILE,
  formatCatalog,
  isWebp,
  photoFileName,
  usedPhotos,
  validateCatalog,
} from './worker/catalog-rules.js'

// API del panel con `npm run dev`: escribe directo en src/catalog.json y public/productos/.
// Es para probar cambios en tu compu: sin login, y solo responde a pedidos de esta misma compu.
// En la web publicada, la API es el Worker de Cloudflare (worker/index.js), que guarda en GitHub.
const ROOT = path.dirname(fileURLToPath(import.meta.url))
const CATALOG_FILE = path.join(ROOT, CATALOG_PATH)
const PHOTOS = path.join(ROOT, PHOTOS_DIR)

class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > limit) {
        reject(new HttpError(413, 'El archivo es demasiado grande.'))
        req.destroy()
      } else chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

// Mismo identificador que usa git (y el Worker), para detectar si el archivo cambió por otro lado.
const versionOf = (text) => createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex')

async function removeUnusedPhotos(catalog) {
  const used = usedPhotos(catalog)
  const files = await readdir(PHOTOS).catch(() => [])
  await Promise.all(
    files.filter((file) => PHOTO_FILE.test(file) && !used.has(`/productos/${file}`)).map((file) => rm(path.join(PHOTOS, file), { force: true })),
  )
}

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1'])

function sameOrigin(origin, host) {
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

async function handle(req) {
  // Solo esta compu: aunque se corra `npm run dev -- --host`, nadie de la red puede usar el panel.
  if (!LOOPBACK.has(req.socket.remoteAddress)) throw new HttpError(403, 'El panel local solo se puede usar desde la compu donde corre `npm run dev`.')
  // Un header propio obliga al navegador a pedir permiso antes de un pedido desde otro sitio,
  // así ninguna página abierta en otra pestaña puede modificar el catálogo.
  if (req.headers['x-conejo-admin'] !== '1') throw new HttpError(403, 'Pedido no permitido.')
  if (req.headers.origin && !sameOrigin(req.headers.origin, req.headers.host)) throw new HttpError(403, 'Pedido no permitido.')
  const url = new URL(req.url, 'http://localhost')
  const route = `${req.method} ${url.pathname}`

  if (route === 'GET /session') return { authenticated: true, user: null, local: true }

  if (route === 'GET /catalog') {
    const text = await readFile(CATALOG_FILE, 'utf8')
    return { catalog: JSON.parse(text), version: versionOf(text) }
  }

  if (route === 'PUT /catalog') {
    let data
    try {
      data = JSON.parse((await readBody(req, MAX_CATALOG_BYTES)).toString('utf8'))
    } catch (error) {
      throw error instanceof HttpError ? error : new HttpError(400, 'El catálogo no es un JSON válido.')
    }
    const { catalog, version } = data ?? {}
    try {
      validateCatalog(catalog)
    } catch (error) {
      throw new HttpError(400, error.message)
    }
    const current = await readFile(CATALOG_FILE, 'utf8')
    if (version && version !== versionOf(current)) {
      throw new HttpError(409, 'El catálogo cambió desde otro lado (otra pestaña o un git pull). Recargá la página para ver la última versión.')
    }
    const text = formatCatalog(catalog)
    const temp = `${CATALOG_FILE}.tmp`
    await writeFile(temp, text)
    await rename(temp, CATALOG_FILE)
    await removeUnusedPhotos(catalog)
    // En Windows git deja los archivos con CRLF: eso solo no cuenta como cambio.
    return { catalog, version: versionOf(text), changed: text !== current.replace(/\r\n/g, '\n') }
  }

  if (route === 'POST /photos') {
    if (req.headers['content-type'] !== 'image/webp') throw new HttpError(415, 'La foto tiene que llegar en formato WebP.')
    const body = await readBody(req, MAX_PHOTO_BYTES)
    if (!isWebp(new Uint8Array(body))) throw new HttpError(415, 'El archivo no es una imagen WebP.')
    const file = photoFileName(url.searchParams.get('name'))
    await mkdir(PHOTOS, { recursive: true })
    await writeFile(path.join(PHOTOS, file), body)
    return { path: `/productos/${file}`, blob: null }
  }

  throw new HttpError(404, 'No existe esa ruta.')
}

export default function adminApi() {
  return {
    name: 'conejo-admin-api',
    apply: 'serve',
    // Cuando cambia el catálogo no hace recarga en caliente: rearmaría el panel y perdería la pestaña
    // o el formulario abierto. En su lugar avisa, y las pestañas de la web se recargan (ver main.jsx).
    hotUpdate({ file, modules, timestamp }) {
      if (path.resolve(file) !== CATALOG_FILE || this.environment.name !== 'client') return
      for (const mod of modules) this.environment.moduleGraph.invalidateModule(mod, new Set(), timestamp, true)
      this.environment.hot.send({ type: 'custom', event: 'conejo:catalogo' })
      return []
    },
    configureServer(server) {
      server.middlewares.use('/api/admin', (req, res) => {
        // Nada de la API queda guardado en el caché del navegador.
        res.setHeader('Cache-Control', 'no-store')
        res.setHeader('X-Content-Type-Options', 'nosniff')
        handle(req)
          .then((data) => {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(data))
          })
          .catch((error) => {
            const status = error instanceof HttpError ? error.status : 500
            if (status === 500) server.config.logger.error(`[panel] ${error.stack ?? error}`)
            res.statusCode = status
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: status === 500 ? 'Error del servidor, mirá la terminal.' : error.message }))
          })
      })
    },
  }
}
