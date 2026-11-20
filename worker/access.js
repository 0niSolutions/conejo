// Verifica que el pedido pasó por Cloudflare Access.
//
// Access pide el mail y manda un código antes de dejar pasar a /admin y /api/admin. Cuando deja pasar,
// agrega el header Cf-Access-Jwt-Assertion: un token firmado por Cloudflare con el mail de quien entró.
// Acá se revisa la firma, el vencimiento, el equipo (ACCESS_TEAM_DOMAIN) y la aplicación (ACCESS_AUD).
// Así, aunque alguien llegue al Worker por otra dirección (por ejemplo *.workers.dev) o Access quede
// mal configurado, sin un token válido no se puede leer ni tocar nada.

export class AccessError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

const KEYS_TTL_MS = 60 * 60 * 1000
let cache = { team: null, keys: new Map(), fetchedAt: 0 }

const teamDomain = (value) =>
  String(value ?? '')
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '')

function base64UrlToBytes(text) {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(text.length / 4) * 4, '=')
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
}

const decodeJson = (part) => JSON.parse(new TextDecoder().decode(base64UrlToBytes(part)))

async function loadKeys(team) {
  const response = await fetch(`https://${team}/cdn-cgi/access/certs`)
  if (!response.ok) throw new AccessError(502, 'No se pudieron leer las claves de Cloudflare Access.')
  const { keys } = await response.json()
  const imported = new Map()
  for (const jwk of keys ?? []) {
    if (jwk.kty !== 'RSA' || !jwk.kid) continue
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'])
    imported.set(jwk.kid, key)
  }
  cache = { team, keys: imported, fetchedAt: Date.now() }
}

async function keyFor(team, kid) {
  const stale = cache.team !== team || Date.now() - cache.fetchedAt > KEYS_TTL_MS
  if (stale || !cache.keys.has(kid)) await loadKeys(team)
  return cache.keys.get(kid)
}

export const allowedEmails = (env) =>
  new Set(
    String(env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  )

// Devuelve el mail de quien entró, o tira AccessError.
export async function verifyAccess(request, env) {
  const team = teamDomain(env.ACCESS_TEAM_DOMAIN)
  const audience = String(env.ACCESS_AUD ?? '').trim()
  if (!team || !audience) throw new AccessError(500, 'Falta configurar ACCESS_TEAM_DOMAIN y ACCESS_AUD en el Worker.')

  const token = request.headers.get('Cf-Access-Jwt-Assertion')
  if (!token) throw new AccessError(401, 'Tu sesión se cerró. Recargá la página para volver a entrar.')

  const parts = token.split('.')
  if (parts.length !== 3) throw new AccessError(401, 'Sesión inválida.')
  let header, payload
  try {
    header = decodeJson(parts[0])
    payload = decodeJson(parts[1])
  } catch {
    throw new AccessError(401, 'Sesión inválida.')
  }
  if (header.alg !== 'RS256' || typeof header.kid !== 'string') throw new AccessError(401, 'Sesión inválida.')

  const key = await keyFor(team, header.kid)
  if (!key) throw new AccessError(401, 'Sesión inválida.')
  const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, base64UrlToBytes(parts[2]), signed)
  if (!valid) throw new AccessError(401, 'Sesión inválida.')

  const now = Math.floor(Date.now() / 1000)
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud]
  if (typeof payload.exp !== 'number' || payload.exp <= now) throw new AccessError(401, 'Tu sesión venció. Recargá la página para volver a entrar.')
  if (typeof payload.nbf === 'number' && payload.nbf > now + 60) throw new AccessError(401, 'Sesión inválida.')
  if (payload.iss !== `https://${team}`) throw new AccessError(401, 'Sesión inválida.')
  if (!audiences.includes(audience)) throw new AccessError(401, 'Sesión inválida.')

  const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : ''
  if (!email) throw new AccessError(403, 'Tu cuenta no tiene un mail asociado.')
  // Segunda lista de mails permitidos, además de la de Access. Obligatoria: si falta, no entra nadie.
  const allowed = allowedEmails(env)
  if (!allowed.has(email)) throw new AccessError(403, `${email} no tiene permiso para usar el panel.`)
  return email
}
