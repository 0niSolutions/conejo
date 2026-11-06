import { createHash, randomBytes, randomInt, scrypt, timingSafeEqual } from 'node:crypto'
import { readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import nodemailer from 'nodemailer'

// Cuentas del panel de administrador.
//
// - Los mails que pueden tener cuenta van en .env.local: ADMIN_EMAILS=uno@gmail.com,otro@gmail.com
//   Si sacás un mail de la lista, esa cuenta deja de poder entrar (y se cierran sus sesiones).
// - El dueño pone su mail, le llega un código de 6 dígitos y con él elige usuario y contraseña.
//   El mismo camino sirve para recuperar la contraseña.
// - ADMIN_USER / ADMIN_PASSWORD es una cuenta de prueba: funciona solo mientras no haya ninguna
//   cuenta de un mail autorizado. Al crear la primera, deja de andar.
// - Los mails salen de Gmail (GMAIL_USER + GMAIL_APP_PASSWORD). Sin eso, el código se muestra en la terminal.
// - Las cuentas se guardan en admin-users.json (fuera de git), con la contraseña protegida con scrypt.

const SESSION_COOKIE = 'conejo_admin'
const SESSION_MS = 12 * 60 * 60 * 1000
const CODE_MS = 10 * 60 * 1000
const CODE_RESEND_MS = 60 * 1000
const CODE_TRIES = 5 // intentos con un mismo código
const CODE_BUDGET = 10 // códigos equivocados por mail en una hora, sumando todos los códigos
const CODE_BUDGET_MS = 60 * 60 * 1000
const MAX_FAILS = 5 // contraseñas equivocadas seguidas antes de bloquear
const LOCK_MS = 60 * 1000 // el bloqueo se duplica cada vez: 1, 2, 4, 8... hasta 30 minutos
const MAX_LOCK_MS = 30 * 60 * 1000
const MIN_PASSWORD = 8
const MAX_PASSWORD = 128
const USERNAME = /^[a-zA-Z0-9._-]{3,30}$/
// Estricto a propósito: el mail se escribe en la terminal y en el encabezado del mensaje.
const EMAIL = /^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/

// scrypt con N = 2^17 (lo que recomienda OWASP). Las cuentas viejas (formato "sal:clave", N = 2^14)
// se siguen aceptando y se actualizan solas al entrar.
const SCRYPT = { N: 2 ** 17, r: 8, p: 1, maxmem: 256 * 1024 * 1024 }
const LEGACY_SCRYPT = { N: 2 ** 14, r: 8, p: 1 }

const digest = (text) => createHash('sha256').update(text).digest()
const sameText = (a, b) => timingSafeEqual(digest(a), digest(b))
const normalizeEmail = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '')

function derive(password, salt, options) {
  return new Promise((resolve, reject) => scrypt(password, salt, 64, options, (error, key) => (error ? reject(error) : resolve(key))))
}

async function hash(password) {
  const salt = randomBytes(16)
  const key = await derive(password, salt, SCRYPT)
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('hex')}$${key.toString('hex')}`
}

// Devuelve si la contraseña es correcta y si el hash guardado es de formato viejo.
async function verify(password, stored) {
  const parts = String(stored).split('$')
  const legacy = parts.length !== 6
  const [salt, key, options] = legacy
    ? [...String(stored).split(':'), LEGACY_SCRYPT]
    : [parts[4], parts[5], { N: Number(parts[1]), r: Number(parts[2]), p: Number(parts[3]), maxmem: SCRYPT.maxmem }]
  const expected = Buffer.from(key ?? '', 'hex')
  if (expected.length !== 64) return { ok: false, legacy }
  const candidate = await derive(password, Buffer.from(salt ?? '', 'hex'), options)
  return { ok: timingSafeEqual(candidate, expected), legacy }
}

function readCookie(req, name) {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const [key, ...value] = part.trim().split('=')
    if (key === name) return value.join('=')
  }
  return null
}

export function createAuth({ root, env, logger, HttpError, readBody }) {
  const USERS_FILE = path.join(root, 'admin-users.json')
  const allowed = new Set((env.ADMIN_EMAILS ?? '').split(',').map(normalizeEmail).filter(Boolean))
  const demo = env.ADMIN_USER?.trim() && env.ADMIN_PASSWORD?.trim() ? { user: env.ADMIN_USER.trim(), password: env.ADMIN_PASSWORD.trim() } : null
  const mailer =
    env.GMAIL_USER && env.GMAIL_APP_PASSWORD
      ? nodemailer.createTransport({ service: 'gmail', auth: { user: env.GMAIL_USER.trim(), pass: env.GMAIL_APP_PASSWORD.replace(/\s/g, '') } })
      : null

  const sessions = new Map() // token -> { user, email (null en la cuenta de prueba), expires }
  const codes = new Map() // mail -> { hash, expires, tries, sentAt }
  const codeFails = new Map() // mail -> { count, since }
  const lock = { fails: 0, until: 0, level: 0 }

  for (const email of allowed) if (!EMAIL.test(email)) logger.warn(`[panel] "${email}" en ADMIN_EMAILS no parece un mail válido.`)
  if (allowed.size === 0) logger.warn('[panel] No hay mails en ADMIN_EMAILS (.env.local): nadie puede crear cuenta.')
  if (!mailer) logger.warn('[panel] Falta GMAIL_USER / GMAIL_APP_PASSWORD: los códigos se muestran acá en la terminal en vez de mandarse por mail.')
  if (demo && demo.password.length < MIN_PASSWORD) logger.warn('[panel] La contraseña de prueba es corta: usala solo para mostrar el panel y creá tu cuenta cuanto antes.')

  // Los pedidos que leen o escriben cuentas se atienden de a uno. Así un montón de intentos
  // mandados al mismo tiempo no se saltean el bloqueo, y dos altas a la vez no pisan el archivo.
  let chain = Promise.resolve()
  function serial(task) {
    const run = chain.then(task)
    chain = run.catch(() => {})
    return run
  }

  async function loadUsers() {
    try {
      const users = JSON.parse(await readFile(USERS_FILE, 'utf8')).users
      return Array.isArray(users) ? users : []
    } catch (error) {
      if (error.code === 'ENOENT') return []
      throw error
    }
  }

  async function saveUsers(users) {
    const temp = `${USERS_FILE}.tmp`
    await writeFile(temp, JSON.stringify({ users }, null, 2) + '\n', { mode: 0o600 })
    await rename(temp, USERS_FILE)
  }

  // Solo cuentan las cuentas de mails que siguen autorizados.
  const activeUsers = (users) => users.filter((item) => allowed.has(item.email))
  const demoActive = (users) => Boolean(demo) && activeUsers(users).length === 0

  async function body(req) {
    let data
    try {
      data = JSON.parse((await readBody(req, 4 * 1024)).toString('utf8'))
    } catch (error) {
      throw error instanceof HttpError ? error : new HttpError(400, 'Pedido inválido.')
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new HttpError(400, 'Pedido inválido.')
    return data
  }

  function cookie(res, token, maxAge) {
    res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${token}; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=${maxAge}`)
  }

  function startSession(res, user, email) {
    const token = randomBytes(32).toString('hex')
    sessions.set(token, { user, email, expires: Date.now() + SESSION_MS })
    cookie(res, token, SESSION_MS / 1000)
  }

  function dropSessions(match) {
    for (const [token, session] of sessions) if (match(session)) sessions.delete(token)
  }

  // La sesión vale si no venció y la cuenta sigue existiendo y autorizada. Si alguien borra la cuenta,
  // saca el mail de ADMIN_EMAILS o se crea la primera cuenta real, la sesión se corta en el próximo pedido.
  async function currentSession(req) {
    const token = readCookie(req, SESSION_COOKIE)
    const session = token && sessions.get(token)
    if (!session) return null
    const users = await loadUsers()
    const valid =
      session.expires > Date.now() &&
      (session.email === null
        ? demoActive(users)
        : allowed.has(session.email) && users.some((item) => item.email === session.email && item.user === session.user))
    if (!valid) {
      sessions.delete(token)
      return null
    }
    return { token, ...session }
  }

  function checkLock() {
    const wait = lock.until - Date.now()
    if (wait > 0) {
      const time = wait > 90_000 ? `${Math.ceil(wait / 60_000)} minutos` : `${Math.ceil(wait / 1000)} segundos`
      throw new HttpError(429, `Demasiados intentos. Esperá ${time}.`)
    }
  }

  function failLogin() {
    lock.fails += 1
    if (lock.fails >= MAX_FAILS) {
      lock.fails = 0
      lock.until = Date.now() + Math.min(LOCK_MS * 2 ** lock.level, MAX_LOCK_MS)
      lock.level += 1
      logger.warn(`[panel] ${MAX_FAILS} contraseñas equivocadas seguidas: login bloqueado un rato.`, { timestamp: true })
    }
    throw new HttpError(401, 'Usuario o contraseña incorrectos.')
  }

  function passLogin(res, user, email) {
    lock.fails = 0
    lock.level = 0
    startSession(res, user, email)
    return { authenticated: true, user }
  }

  async function login(req, res) {
    const data = await body(req)
    return serial(async () => {
      checkLock()
      const name = typeof data.user === 'string' ? data.user.trim().toLowerCase() : ''
      const password = typeof data.password === 'string' ? data.password : ''
      if (!name || !password || password.length > MAX_PASSWORD) failLogin()

      const users = await loadUsers()
      if (demoActive(users)) {
        // Compara las dos cosas siempre, así la demora no revela si el usuario era correcto.
        const userOk = sameText(name, demo.user.toLowerCase())
        const passwordOk = sameText(password, demo.password)
        if (!userOk || !passwordOk) failLogin()
        return passLogin(res, demo.user, null)
      }

      // Se puede entrar con el usuario o con el mail. Si no existe, igual calcula un hash para que
      // la demora sea la misma y no se pueda averiguar qué usuarios hay.
      const account = activeUsers(users).find((item) => item.user.toLowerCase() === name || item.email === name)
      if (!account) {
        await hash(password)
        failLogin()
      }
      const { ok, legacy } = await verify(password, account.hash)
      if (!ok) failLogin()
      if (legacy) {
        const upgraded = { ...account, hash: await hash(password) }
        await saveUsers(users.map((item) => (item.email === account.email ? upgraded : item)))
      }
      return passLogin(res, account.user, account.email)
    })
  }

  function codeBudget(email) {
    const entry = codeFails.get(email)
    if (!entry || Date.now() - entry.since > CODE_BUDGET_MS) return { count: 0, since: Date.now() }
    return entry
  }

  async function sendCode(req) {
    const raw = (await body(req)).email
    const email = normalizeEmail(raw)
    if (email.length > 254 || !EMAIL.test(email)) throw new HttpError(400, 'Escribí un mail válido.')

    return serial(async () => {
      // Misma respuesta para mails autorizados y no autorizados: no revela cuál es el mail del dueño.
      const generic = { sent: true, message: 'Si ese mail está autorizado, te llegó un código. Revisá también la carpeta de spam.' }
      if (!allowed.has(email)) {
        logger.warn(`[panel] Se pidió un código para ${email}, que no está en ADMIN_EMAILS.`, { timestamp: true })
        return generic
      }
      const previous = codes.get(email)
      if (previous && Date.now() - previous.sentAt < CODE_RESEND_MS) {
        throw new HttpError(429, 'Ya se pidió un código hace menos de un minuto. Esperá un poco antes de pedir otro.')
      }
      if (codeBudget(email).count >= CODE_BUDGET) {
        throw new HttpError(429, 'Hubo demasiados códigos equivocados. Probá de nuevo en una hora.')
      }

      const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
      const existing = (await loadUsers()).some((item) => item.email === email)
      const subject = existing ? 'Tu código para cambiar la contraseña del panel' : 'Tu código para crear tu cuenta del panel'
      const text = `Tu código es ${code}\n\nVence en 10 minutos. Si no lo pediste vos, ignorá este mail: nadie puede entrar sin este código.\n\nConejo · Panel de administrador`

      if (mailer) {
        try {
          await mailer.sendMail({ from: { name: 'Conejo · Panel', address: env.GMAIL_USER.trim() }, to: email, subject, text })
        } catch (error) {
          logger.error(`[panel] No se pudo mandar el mail: ${error.message}`)
          throw new HttpError(502, 'No se pudo mandar el mail. Revisá GMAIL_USER y GMAIL_APP_PASSWORD en .env.local.')
        }
      } else {
        logger.info(`[panel] Código para ${email}: ${code} (configurá Gmail en .env.local para mandarlo por mail)`, { timestamp: true })
      }
      codes.set(email, { hash: digest(code), expires: Date.now() + CODE_MS, tries: 0, sentAt: Date.now() })
      return generic
    })
  }

  // Con el código del mail: crea la cuenta o, si ya existe, le cambia el usuario y la contraseña.
  async function confirm(req, res) {
    const data = await body(req)
    const email = normalizeEmail(data.email)
    const user = typeof data.user === 'string' ? data.user.trim() : ''
    const password = typeof data.password === 'string' ? data.password : ''
    const code = typeof data.code === 'string' ? data.code.trim() : ''

    // Primero lo que no gasta el código, así un error de tipeo en el usuario no obliga a pedir otro.
    if (!USERNAME.test(user)) throw new HttpError(400, 'El usuario tiene que tener entre 3 y 30 letras o números (sin espacios).')
    if (password.length < MIN_PASSWORD) throw new HttpError(400, `La contraseña tiene que tener al menos ${MIN_PASSWORD} caracteres.`)
    if (password.length > MAX_PASSWORD) throw new HttpError(400, `La contraseña puede tener hasta ${MAX_PASSWORD} caracteres.`)
    if (demo && sameText(password, demo.password)) throw new HttpError(400, 'Elegí una contraseña distinta a la de la cuenta de prueba.')

    return serial(async () => {
      const entry = codes.get(email)
      if (!entry || entry.expires < Date.now() || !allowed.has(email)) {
        codes.delete(email)
        throw new HttpError(400, 'El código venció o no existe. Pedí uno nuevo.')
      }
      if (!timingSafeEqual(digest(code), entry.hash)) {
        entry.tries += 1
        const budget = codeBudget(email)
        codeFails.set(email, { ...budget, count: budget.count + 1 })
        if (entry.tries >= CODE_TRIES || budget.count + 1 >= CODE_BUDGET) {
          codes.delete(email)
          logger.warn(`[panel] Demasiados códigos equivocados para ${email}.`, { timestamp: true })
          throw new HttpError(400, 'Demasiados intentos con ese código. Pedí uno nuevo.')
        }
        throw new HttpError(400, 'El código no es correcto.')
      }

      const users = await loadUsers()
      if (users.some((item) => item.user.toLowerCase() === user.toLowerCase() && item.email !== email)) {
        throw new HttpError(400, 'Ese usuario ya lo usa otra cuenta. Elegí otro.')
      }
      codes.delete(email)
      codeFails.delete(email)

      const account = { email, user, hash: await hash(password), updatedAt: new Date().toISOString() }
      const isNew = !users.some((item) => item.email === email)
      await saveUsers(isNew ? [...users, account] : users.map((item) => (item.email === email ? account : item)))

      // Cierra las sesiones de esta cuenta (por si alguien más tenía la contraseña vieja) y las de
      // la cuenta de prueba, que deja de valer. Después entra con la cuenta nueva.
      dropSessions((session) => session.email === email || session.email === null)
      startSession(res, user, email)
      logger.info(`[panel] ${isNew ? 'Cuenta creada' : 'Contraseña cambiada'} para ${email} (usuario ${user}).`, { timestamp: true })
      return { authenticated: true, user, created: isNew }
    })
  }

  return {
    isLoggedIn: async (req) => Boolean(await currentSession(req)),

    // Atiende las rutas de cuentas. Devuelve undefined si la ruta no es de cuentas.
    async handle(req, res, url) {
      const route = `${req.method} ${url.pathname}`
      if (route === 'POST /login') return login(req, res)
      if (route === 'POST /code') return sendCode(req)
      if (route === 'POST /confirm') return confirm(req, res)
      if (route === 'POST /logout') {
        const token = readCookie(req, SESSION_COOKIE)
        if (token) sessions.delete(token)
        cookie(res, '', 0)
        return { authenticated: false }
      }
      if (route === 'GET /session') {
        const session = await currentSession(req)
        return { authenticated: Boolean(session), user: session?.user ?? null, demo: demoActive(await loadUsers()) }
      }
      return undefined
    },
  }
}
