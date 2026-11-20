// Lee y guarda el catálogo directamente en el repo de GitHub.
//
// Cada "Guardar" del panel es un commit en la rama configurada (GITHUB_BRANCH) con src/catalog.json,
// las fotos nuevas y el borrado de las que ya no se usan. Ese commit dispara el build de Cloudflare,
// que publica la web con el catálogo nuevo en uno o dos minutos.
//
// Las fotos se suben antes de guardar como "blobs" sueltos de git: todavía no forman parte de ningún
// commit (no disparan builds). Recién al guardar el catálogo entran al commit las que se usan.

import { CATALOG_PATH, PHOTOS_DIR, PHOTO_FILE, PHOTO_PATH, formatCatalog, usedPhotos } from './catalog-rules.js'

export class GitHubError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

const SHA = /^[0-9a-f]{40}$/

function config(env) {
  const repo = String(env.GITHUB_REPO ?? '').trim()
  const branch = String(env.GITHUB_BRANCH ?? '').trim() || 'main'
  const token = String(env.GITHUB_TOKEN ?? '').trim()
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo) || !token) throw new GitHubError(500, 'Falta configurar GITHUB_REPO y GITHUB_TOKEN en el Worker.')
  return { repo, branch, token }
}

async function github(env, path, { method = 'GET', body, accept = 'application/vnd.github+json', notFound } = {}) {
  const { repo, token } = config(env)
  const response = await fetch(`https://api.github.com/repos/${repo}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: accept,
      'User-Agent': 'conejo-panel',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (response.ok) return response
  if (response.status === 404 && notFound) throw new GitHubError(404, notFound)
  if (response.status === 401) throw new GitHubError(502, 'El token de GitHub venció o no es válido. Hay que generar uno nuevo y cargarlo en el Worker.')
  if (response.status === 403 || response.status === 404) {
    throw new GitHubError(502, 'GitHub no dejó entrar al repo. Revisá que el token tenga permiso de "Contents: Read and write" sobre este repo.')
  }
  const error = new GitHubError(502, `GitHub respondió ${response.status}.`)
  error.githubStatus = response.status
  throw error
}

const json = async (response) => response.json()

// El mismo identificador que git le da a un archivo, para saber si el catálogo cambió sin descargarlo.
export async function gitBlobSha(bytes) {
  const header = new TextEncoder().encode(`blob ${bytes.length}\0`)
  const data = new Uint8Array(header.length + bytes.length)
  data.set(header)
  data.set(bytes, header.length)
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-1', data))
  return [...digest].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function toBase64(bytes) {
  if (typeof bytes.toBase64 === 'function') return bytes.toBase64()
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

function fromBase64(text) {
  return Uint8Array.from(atob(text.replace(/\s/g, '')), (char) => char.charCodeAt(0))
}

// Catálogo tal como está ahora en GitHub, y su versión (para detectar cambios hechos por otra persona).
export async function readCatalog(env) {
  const { branch } = config(env)
  const file = await json(await github(env, `/contents/${CATALOG_PATH}?ref=${encodeURIComponent(branch)}`))
  const text = new TextDecoder().decode(fromBase64(file.content))
  return { catalog: JSON.parse(text), version: file.sha }
}

// Sube una foto como blob suelto. Devuelve el sha, que el panel manda al guardar.
export async function uploadBlob(env, bytes) {
  const blob = await json(await github(env, '/git/blobs', { method: 'POST', body: { content: toBase64(bytes), encoding: 'base64' } }))
  return blob.sha
}

// Una foto ya guardada en el repo, para mostrarla en el panel antes de que termine el deploy.
export async function readPhoto(env, file) {
  if (!PHOTO_FILE.test(file)) throw new GitHubError(404, 'No existe esa foto.')
  const { branch } = config(env)
  return github(env, `/contents/${PHOTOS_DIR}/${file}?ref=${encodeURIComponent(branch)}`, {
    accept: 'application/vnd.github.raw',
    notFound: 'No existe esa foto.',
  })
}

async function attemptSave(env, { catalog, version, uploads, author }) {
  const { branch } = config(env)
  const ref = await json(await github(env, `/git/ref/heads/${encodeURIComponent(branch)}`))
  const head = await json(await github(env, `/git/commits/${ref.object.sha}`))
  const tree = await json(await github(env, `/git/trees/${head.tree.sha}?recursive=1`))
  if (tree.truncated) throw new GitHubError(500, 'El repo es demasiado grande para leerlo de una vez.')

  const files = new Map(tree.tree.filter((entry) => entry.type === 'blob').map((entry) => [entry.path, entry.sha]))

  // Si alguien guardó otra cosa desde que se abrió el panel, no la pisa.
  const current = files.get(CATALOG_PATH)
  if (version && current && version !== current) {
    throw new GitHubError(409, 'El catálogo cambió desde otro lado (otra pestaña u otra persona). Recargá la página para ver la última versión.')
  }

  const text = formatCatalog(catalog)
  const newVersion = await gitBlobSha(new TextEncoder().encode(text))
  const changes = []
  if (newVersion !== current) changes.push({ path: CATALOG_PATH, mode: '100644', type: 'blob', content: text })

  const used = usedPhotos(catalog)
  for (const photo of used) {
    const path = `${PHOTOS_DIR}/${photo.match(PHOTO_PATH)[1]}`
    if (files.has(path)) continue
    const sha = uploads?.[photo]
    if (typeof sha !== 'string' || !SHA.test(sha)) throw new GitHubError(400, 'Falta una foto nueva. Quitala y volvé a subirla.')
    changes.push({ path, mode: '100644', type: 'blob', sha })
  }
  // Borra las fotos del panel que ya no usa ningún producto ni línea.
  for (const path of files.keys()) {
    const name = path.startsWith(`${PHOTOS_DIR}/`) ? path.slice(PHOTOS_DIR.length + 1) : null
    if (name && PHOTO_FILE.test(name) && !used.has(`/productos/${name}`)) changes.push({ path, mode: '100644', type: 'blob', sha: null })
  }

  if (changes.length === 0) return { version: newVersion, changed: false }

  let newTree
  try {
    newTree = await json(await github(env, '/git/trees', { method: 'POST', body: { base_tree: head.tree.sha, tree: changes } }))
  } catch (error) {
    // Un blob que GitHub ya no tiene (por ejemplo, una foto subida hace semanas y nunca guardada).
    if (error.githubStatus === 422) throw new GitHubError(400, 'Una de las fotos nuevas ya no está disponible. Quitala y volvé a subirla.')
    throw error
  }
  const message = `Panel: actualizar catálogo\n\nCambio hecho desde el panel por ${author.split('@')[0]}.`
  const commit = await json(await github(env, '/git/commits', { method: 'POST', body: { message, tree: newTree.sha, parents: [head.sha] } }))
  await github(env, `/git/refs/heads/${encodeURIComponent(branch)}`, { method: 'PATCH', body: { sha: commit.sha, force: false } })
  return { version: newVersion, changed: true }
}

// Guarda el catálogo en un commit. Si justo entró otro commit a la rama (un push), lo vuelve a intentar.
export async function saveCatalog(env, data) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await attemptSave(env, data)
    } catch (error) {
      if (error.githubStatus === 422 && attempt < 3) continue
      if (error.githubStatus === 422) throw new GitHubError(409, 'No se pudo guardar porque el repo estaba cambiando. Probá de nuevo.')
      throw error
    }
  }
}
