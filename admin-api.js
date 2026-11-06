import { randomBytes } from 'node:crypto'
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv } from 'vite'
import { createAuth } from './admin-auth.js'

// API del panel de administrador. Solo existe con `npm run dev`: la web publicada es estática
// y no la incluye. Más adelante se reemplaza por una base de datos real.
const ROOT = path.dirname(fileURLToPath(import.meta.url))
const CATALOG_FILE = path.join(ROOT, 'src', 'catalog.json')
const PHOTOS_DIR = path.join(ROOT, 'public', 'productos')
const PHOTO_PATH = /^\/productos\/([a-z0-9-]+-[a-f0-9]{8}\.webp)$/
const MAX_PHOTO_BYTES = 8 * 1024 * 1024

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

const isText = (value) => typeof value === 'string' && value.trim() !== ''
const isSlug = (value) => typeof value === 'string' && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value)
const isPhoto = (value) => typeof value === 'string' && PHOTO_PATH.test(value)

function validate(catalog) {
  const fail = (message) => {
    throw new HttpError(400, message)
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
}

// Borra las fotos subidas por el panel que ya no usa ningún producto ni línea.
async function removeUnusedPhotos(catalog) {
  const used = new Set([...catalog.lines.map((line) => line.photo), ...catalog.products.flatMap((product) => product.photos)])
  const files = await readdir(PHOTOS_DIR).catch(() => [])
  await Promise.all(
    files
      .filter((file) => PHOTO_PATH.test(`/productos/${file}`) && !used.has(`/productos/${file}`))
      .map((file) => rm(path.join(PHOTOS_DIR, file), { force: true })),
  )
}

async function handle(req, res, auth) {
  // Un header propio obliga al navegador a pedir permiso antes de un pedido desde otro sitio,
  // así ninguna página abierta en otra pestaña puede modificar el catálogo.
  if (req.headers['x-conejo-admin'] !== '1') throw new HttpError(403, 'Pedido no permitido.')
  const url = new URL(req.url, 'http://localhost')

  const answer = await auth.handle(req, res, url)
  if (answer !== undefined) return answer

  // Todo lo demás necesita haber iniciado sesión.
  if (!auth.isLoggedIn(req)) throw new HttpError(401, 'Tu sesión se cerró. Volvé a entrar.')

  if (url.pathname === '/catalog' && req.method === 'GET') {
    return JSON.parse(await readFile(CATALOG_FILE, 'utf8'))
  }

  if (url.pathname === '/catalog' && req.method === 'PUT') {
    let catalog
    try {
      catalog = JSON.parse((await readBody(req, 2 * 1024 * 1024)).toString('utf8'))
    } catch (error) {
      throw error instanceof HttpError ? error : new HttpError(400, 'El catálogo no es un JSON válido.')
    }
    validate(catalog)
    const temp = `${CATALOG_FILE}.tmp`
    await writeFile(temp, JSON.stringify(catalog, null, 2) + '\n')
    await rename(temp, CATALOG_FILE)
    await removeUnusedPhotos(catalog)
    return catalog
  }

  if (url.pathname === '/photos' && req.method === 'POST') {
    if (req.headers['content-type'] !== 'image/webp') throw new HttpError(415, 'La foto tiene que llegar en formato WebP.')
    const body = await readBody(req, MAX_PHOTO_BYTES)
    const isWebp = body.subarray(0, 4).toString('latin1') === 'RIFF' && body.subarray(8, 12).toString('latin1') === 'WEBP'
    if (!isWebp) throw new HttpError(415, 'El archivo no es una imagen WebP.')
    const base = (url.searchParams.get('name') ?? '').match(/[a-z0-9]+/g)?.join('-').slice(0, 40) || 'foto'
    const file = `${base}-${randomBytes(4).toString('hex')}.webp`
    await mkdir(PHOTOS_DIR, { recursive: true })
    await writeFile(path.join(PHOTOS_DIR, file), body)
    return { path: `/productos/${file}` }
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
      const env = loadEnv(server.config.mode, server.config.envDir || server.config.root, '')
      const auth = createAuth({ root: ROOT, env, logger: server.config.logger, HttpError, readBody })
      server.middlewares.use('/api/admin', (req, res) => {
        handle(req, res, auth)
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
