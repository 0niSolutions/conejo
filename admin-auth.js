import { randomBytes, randomInt, scrypt, timingSafeEqual, createHash } from 'node:crypto'
import { readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import nodemailer from 'nodemailer'

// Cuentas del panel de administrador.
//
// - Los mails que pueden crear cuenta van en .env.local: ADMIN_EMAILS=uno@gmail.com,otro@gmail.com
// - El dueño pone su mail, le llega un código de 6 dígitos y con él elige usuario y contraseña.
//   El mismo camino sirve para recuperar la contraseña.
// - ADMIN_USER / ADMIN_PASSWORD es una cuenta de prueba: funciona solo mientras no exista
//   ninguna cuenta creada por mail. Al crear la primera, deja de andar.
// - Los mails salen de Gmail (GMAIL_USER + GMAIL_APP_PASSWORD). Sin eso, el código se muestra en la terminal.
// - Las cuentas se guardan en admin-users.json (fuera de git), con la contraseña cifrada.

const hashPassword = promisify(scrypt)
const SESSION_COOKIE = 'conejo_admin'
const SESSION_MS = 12 * 60 * 60 * 1000
const CODE_MS = 10 * 60 * 1000
const CODE_RESEND_MS = 60 * 1000
const CODE_TRIES = 5
const MAX_FAILS = 5
const LOCK_MS = 60 * 1000
const MIN_PASSWORD = 8
const USERNAME = /^[a-zA-Z0-9._-]{3,30}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const digest = (text) => createHash('sha256').update(text).digest()
const sameText = (a, b) => timingSafeEqual(digest(a), digest(b))
const normalizeEmail = (value) => String(value ?? '').trim().toLowerCase()

function readCookie(req, name) {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const [key, ...value] = part.trim().split('=')
    if (key === name) return decodeURIComponent(value.join('='))
  }
  return null
}

async function hash(password) {
  const salt = randomBytes(16)
  const key = await hashPassword(password, salt, 64)
  return `${salt.toString('hex')}:${key.toString('hex')}`
}

async function verify(password, stored) {
  const [salt, key] = stored.split(':')
  const candidate = await hashPassword(password, Buffer.from(salt, 'hex'), 64)
  return timingSafeEqual(candidate, Buffer.from(key, 'hex'))
}

export function createAuth({ root, env, logger, HttpError, readBody }) {
  const USERS_FILE = path.join(root, 'admin-users.json')
  const allowed = new Set((env.ADMIN_EMAILS ?? '').split(',').map(normalizeEmail).filter(Boolean))
  const demo = env.ADMIN_USER?.trim() && env.ADMIN_PASSWORD?.trim() ? { user: env.ADMIN_USER.trim(), password: env.ADMIN_PASSWORD.trim() } : null
  const mailer =
    env.GMAIL_USER && env.GMAIL_APP_PASSWORD
      ? nodemailer.createTransport({ service: 'gmail', auth: { user: env.GMAIL_USER.trim(), pass: env.GMAIL_APP_PASSWORD.replace(/\s/g, '') } })
      : null

  const sessions = new Map() // token -> { user, expires }
  const codes = new Map() // mail -> { hash, expires, tries, sentAt }
  const attempts = { fails: 0, lockedUntil: 0 }

  if (allowed.size === 0) logger.warn('[panel] No hay mails en ADMIN_EMAILS (.env.local): nadie puede crear cuenta.')
  if (!mailer) logger.warn('[panel] Falta GMAIL_USER / GMAIL_APP_PASSWORD: los códigos se muestran acá en la terminal en vez de mandarse por mail.')

  async function loadUsers() {
    try {
      return JSON.parse(await readFile(USERS_FILE, 'utf8')).users ?? []
    } catch (error) {
      if (error.code === 'ENOENT') return []
      throw error
    }
  }

  async function saveUsers(users) {
    const temp = `${USERS_FILE}.tmp`
    await writeFile(temp, JSON.stringify({ users }, null, 2) + '\n')
    await rename(temp, USERS_FILE)
  }

  async function body(req) {
    try {
      return JSON.parse((await readBody(req, 4 * 1024)).toString('utf8')) ?? {}
    } catch {
      throw new HttpError(400, 'Pedido inválido.')
    }
  }

  function currentSession(req) {
    const token = readCookie(req, SESSION_COOKIE)
    const session = token && sessions.get(token)
    if (!session) return null
    if (session.expires < Date.now()) {
      sessions.delete(token)
      return null
    }
    return { token, ...session }
  }

  function startSession(res, user) {
    const token = randomBytes(32).toString('hex')
    sessions.set(token, { user, expires: Date.now() + SESSION_MS })
    res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${token}; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=${SESSION_MS / 1000}`)
  }

  function checkLock() {
    const now = Date.now()
    if (attempts.lockedUntil > now) throw new HttpError(429, `Demasiados intentos. Esperá ${Math.ceil((attempts.lockedUntil - now) / 1000)} segundos.`)
  }

  function fail(message) {
    attempts.fails += 1
    if (attempts.fails >= MAX_FAILS) {
      attempts.fails = 0
      attempts.lockedUntil = Date.now() + LOCK_MS
    }
    throw new HttpError(401, message)
  }

  async function login(req, res) {
    checkLock()
    const { user, password } = await body(req)
    if (typeof user !== 'string' || typeof password !== 'string') fail('Usuario o contraseña incorrectos.')
    const name = user.trim().toLowerCase()
    const users = await loadUsers()

    if (users.length > 0) {
      // Se puede entrar con el usuario o con el mail.
      const account = users.find((item) => item.user.toLowerCase() === name || item.email === name)
      const ok = account ? await verify(password, account.hash) : (await hash(password), false)
      if (!ok) fail('Usuario o contraseña incorrectos.')
      attempts.fails = 0
      startSession(res, account.user)
      return { authenticated: true, user: account.user }
    }

    if (!demo) throw new HttpError(401, 'Todavía no hay ninguna cuenta. Creá la tuya con tu mail.')
    // Compara las dos cosas siempre, así la demora no revela si el usuario era correcto.
    const userOk = sameText(name, demo.user.toLowerCase())
    const passwordOk = sameText(password, demo.password)
    if (!userOk || !passwordOk) fail('Usuario o contraseña incorrectos.')
    attempts.fails = 0
    startSession(res, demo.user)
    return { authenticated: true, user: demo.user }
  }

  async function sendCode(req) {
    const email = normalizeEmail((await body(req)).email)
    if (!EMAIL.test(email)) throw new HttpError(400, 'Escribí un mail válido.')
    const generic = { sent: true, message: `Si ${email} está autorizado, te llegó un código. Revisá también la carpeta de spam.` }
    if (!allowed.has(email)) {
      logger.warn(`[panel] Se pidió un código para ${email}, que no está en ADMIN_EMAILS.`)
      return generic
    }
    const previous = codes.get(email)
    if (previous && Date.now() - previous.sentAt < CODE_RESEND_MS) {
      throw new HttpError(429, 'Ya te mandamos un código hace menos de un minuto. Esperá un poco antes de pedir otro.')
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
    const existing = (await loadUsers()).find((item) => item.email === email)
    const subject = existing ? 'Tu código para cambiar la contraseña del panel' : 'Tu código para crear tu cuenta del panel'
    const text = `Tu código es ${code}\n\nVence en 10 minutos. Si no lo pediste vos, ignorá este mail.\n\nConejo · Panel de administrador`

    if (mailer) {
      try {
        await mailer.sendMail({ from: `Conejo · Panel <${env.GMAIL_USER.trim()}>`, to: email, subject, text })
      } catch (error) {
        logger.error(`[panel] No se pudo mandar el mail: ${error.message}`)
        throw new HttpError(502, 'No se pudo mandar el mail. Revisá GMAIL_USER y GMAIL_APP_PASSWORD en .env.local.')
      }
    } else {
      logger.info(`[panel] Código para ${email}: ${code} (configurá Gmail en .env.local para mandarlo por mail)`, { timestamp: true })
    }
    codes.set(email, { hash: digest(code), expires: Date.now() + CODE_MS, tries: 0, sentAt: Date.now() })
    return generic
  }

  // Con el código del mail: crea la cuenta o, si ya existe, le cambia el usuario y la contraseña.
  async function confirm(req, res) {
    const data = await body(req)
    const email = normalizeEmail(data.email)
    const user = String(data.user ?? '').trim()
    const password = typeof data.password === 'string' ? data.password : ''

    const entry = codes.get(email)
    if (!entry || entry.expires < Date.now()) {
      codes.delete(email)
      throw new HttpError(400, 'El código venció o no existe. Pedí uno nuevo.')
    }
    if (!timingSafeEqual(digest(String(data.code ?? '').trim()), entry.hash)) {
      entry.tries += 1
      if (entry.tries >= CODE_TRIES) {
        codes.delete(email)
        throw new HttpError(400, 'Demasiados intentos con ese código. Pedí uno nuevo.')
      }
      throw new HttpError(400, 'El código no es correcto.')
    }
    if (!USERNAME.test(user)) throw new HttpError(400, 'El usuario tiene que tener entre 3 y 30 letras o números (sin espacios).')
    if (password.length < MIN_PASSWORD) throw new HttpError(400, `La contraseña tiene que tener al menos ${MIN_PASSWORD} caracteres.`)

    const users = await loadUsers()
    const taken = users.find((item) => item.user.toLowerCase() === user.toLowerCase() && item.email !== email)
    if (taken) throw new HttpError(400, 'Ese usuario ya lo usa otra cuenta. Elegí otro.')

    const account = { email, user, hash: await hash(password), updatedAt: new Date().toISOString() }
    const isNew = !users.some((item) => item.email === email)
    await saveUsers(isNew ? [...users, account] : users.map((item) => (item.email === email ? account : item)))
    codes.delete(email)

    // Cierra todas las sesiones abiertas (incluida la de prueba) y entra con la cuenta nueva.
    sessions.clear()
    startSession(res, user)
    logger.info(`[panel] ${isNew ? 'Cuenta creada' : 'Contraseña cambiada'} para ${email} (usuario ${user}).`, { timestamp: true })
    return { authenticated: true, user, created: isNew }
  }

  return {
    isLoggedIn: (req) => Boolean(currentSession(req)),

    // Atiende las rutas de cuentas. Devuelve undefined si la ruta no es de cuentas.
    async handle(req, res, url) {
      const route = `${req.method} ${url.pathname}`
      if (route === 'POST /login') return login(req, res)
      if (route === 'POST /code') return sendCode(req)
      if (route === 'POST /confirm') return confirm(req, res)
      if (route === 'POST /logout') {
        const session = currentSession(req)
        if (session) sessions.delete(session.token)
        res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=0`)
        return { authenticated: false }
      }
      if (route === 'GET /session') {
        const session = currentSession(req)
        const hasAccounts = (await loadUsers()).length > 0
        return { authenticated: Boolean(session), user: session?.user ?? null, demo: !hasAccounts && Boolean(demo) }
      }
      return undefined
    },
  }
}
