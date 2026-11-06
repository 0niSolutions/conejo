import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowLeft, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from 'lucide-react'
import { confirmCode, login, requestCode } from './api'
import { Field, INPUT, PRIMARY } from './parts'

const LINK = 'text-sm text-ash underline underline-offset-4 transition-colors hover:text-bone'

function PasswordInput({ value, onChange, autoComplete, invalid }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        className={`${INPUT} pr-11`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={invalid}
      />
      <button
        type="button"
        className="absolute inset-y-0 right-0 grid w-11 place-items-center text-ash hover:text-bone"
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}

function SubmitButton({ sending, children }) {
  return (
    <button type="submit" className={`${PRIMARY} mt-6 w-full`} disabled={sending}>
      {sending && <LoaderCircle className="size-4 animate-spin" />}
      {children}
    </button>
  )
}

// Hace el pedido, muestra el error si falla y avisa mientras espera.
function useSubmit() {
  const [error, setError] = useState(null)
  const [sending, setSending] = useState(false)
  async function run(action) {
    setSending(true)
    setError(null)
    try {
      await action()
    } catch (failure) {
      setError(failure.message)
    } finally {
      setSending(false)
    }
  }
  return { error, setError, sending, run }
}

function useAutofocus() {
  const ref = useRef(null)
  useEffect(() => ref.current?.focus(), [])
  return ref
}

function SignIn({ demo, onLogin, onUseEmail }) {
  const [user, setUser] = useState('')
  const [password, setPassword] = useState('')
  const { error, setError, sending, run } = useSubmit()
  const first = useAutofocus()

  function submit(event) {
    event.preventDefault()
    if (!user.trim() || !password) return setError(!user.trim() ? 'Escribí tu usuario o mail.' : 'Escribí la contraseña.')
    run(async () => {
      try {
        await login(user, password)
        onLogin()
      } catch (failure) {
        setPassword('')
        throw failure
      }
    })
  }

  return (
    <form onSubmit={submit} noValidate>
      <p className="mt-2 text-sm text-ash">Entrá con tu usuario (o tu mail) y tu contraseña.</p>
      {demo && (
        <p className="mt-4 rounded-xl border border-sun-1/40 px-3.5 py-2.5 text-sm text-ash">
          Está activa la cuenta de prueba. Cuando crees tu cuenta con tu mail, la de prueba deja de funcionar.
        </p>
      )}
      <div className="mt-6 space-y-4">
        <Field label="Usuario o mail">
          <input
            ref={first}
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            className={INPUT}
            value={user}
            onChange={(event) => setUser(event.target.value)}
            aria-invalid={Boolean(error)}
          />
        </Field>
        <Field label="Contraseña" error={error}>
          <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" invalid={Boolean(error)} />
        </Field>
      </div>
      <SubmitButton sending={sending}>Entrar</SubmitButton>
      <div className="mt-5 flex flex-col items-center gap-2">
        <button type="button" className={LINK} onClick={() => onUseEmail('create')}>
          Crear mi cuenta con mi mail
        </button>
        <button type="button" className={LINK} onClick={() => onUseEmail('reset')}>
          Me olvidé la contraseña
        </button>
      </div>
    </form>
  )
}

function AskCode({ purpose, onSent }) {
  const [email, setEmail] = useState('')
  const { error, setError, sending, run } = useSubmit()
  const first = useAutofocus()

  function submit(event) {
    event.preventDefault()
    if (!email.trim()) return setError('Escribí tu mail.')
    run(async () => {
      const { message } = await requestCode(email)
      onSent(email.trim().toLowerCase(), message)
    })
  }

  return (
    <form onSubmit={submit} noValidate>
      <p className="mt-2 text-sm text-ash">
        {purpose === 'create'
          ? 'Poné tu mail y te mandamos un código para crear tu usuario y contraseña.'
          : 'Poné el mail de tu cuenta y te mandamos un código para elegir una contraseña nueva.'}
      </p>
      <div className="mt-6">
        <Field label="Mail" error={error}>
          <input
            ref={first}
            type="email"
            autoComplete="email"
            className={INPUT}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(error)}
          />
        </Field>
      </div>
      <SubmitButton sending={sending}>
        <Mail className="size-4" /> Mandarme el código
      </SubmitButton>
    </form>
  )
}

function SetAccount({ purpose, email, message, onLogin, onResend }) {
  const [code, setCode] = useState('')
  const [user, setUser] = useState('')
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const { error, setError, sending, run } = useSubmit()
  const first = useAutofocus()

  function submit(event) {
    event.preventDefault()
    if (!/^\d{6}$/.test(code.trim())) return setError('El código tiene 6 números.')
    if (!user.trim()) return setError('Elegí un usuario.')
    if (password.length < 8) return setError('La contraseña tiene que tener al menos 8 caracteres.')
    if (password !== repeat) return setError('Las dos contraseñas no coinciden.')
    run(async () => {
      await confirmCode({ email, code: code.trim(), user: user.trim(), password })
      onLogin()
    })
  }

  return (
    <form onSubmit={submit} noValidate>
      <p className="mt-2 text-sm text-ash">{message}</p>
      <div className="mt-6 space-y-4">
        <Field label="Código del mail" hint="Vence en 10 minutos.">
          <input
            ref={first}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            className={`${INPUT} text-center text-lg tracking-[0.5em] tabular-nums`}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
          />
        </Field>
        <Field label="Usuario" hint="Entre 3 y 30 letras o números, sin espacios.">
          <input
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            className={INPUT}
            value={user}
            onChange={(event) => setUser(event.target.value)}
          />
        </Field>
        <Field label={purpose === 'create' ? 'Contraseña' : 'Contraseña nueva'} hint="Al menos 8 caracteres.">
          <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" />
        </Field>
        <Field label="Repetí la contraseña" error={error}>
          <PasswordInput value={repeat} onChange={setRepeat} autoComplete="new-password" invalid={Boolean(error)} />
        </Field>
      </div>
      <SubmitButton sending={sending}>{purpose === 'create' ? 'Crear cuenta y entrar' : 'Guardar y entrar'}</SubmitButton>
      <div className="mt-5 text-center">
        <button type="button" className={LINK} onClick={onResend}>
          No me llegó el código
        </button>
      </div>
    </form>
  )
}

export default function Login({ onLogin, notice, demo }) {
  // step: 'signin' | 'email' | 'code'
  const [step, setStep] = useState({ name: 'signin' })

  useEffect(() => {
    document.title = 'Entrar · Panel · Conejo'
  }, [])

  const titles = { signin: 'Panel', email: step.purpose === 'create' ? 'Crear cuenta' : 'Recuperar acceso', code: 'Revisá tu mail' }

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <motion.div
        key={step.name}
        className="w-full max-w-sm rounded-3xl border border-line p-8"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between">
          <LockKeyhole className="size-8 text-sun-1" />
          {step.name !== 'signin' && (
            <button type="button" className={`${LINK} inline-flex items-center gap-1 no-underline`} onClick={() => setStep({ name: 'signin' })}>
              <ArrowLeft className="size-4" /> Volver
            </button>
          )}
        </div>
        <h1 className="mt-4 font-brush text-3xl leading-none">{titles[step.name]}</h1>
        {notice && step.name === 'signin' && <p className="mt-4 rounded-xl border border-line px-3.5 py-2.5 text-sm text-ash">{notice}</p>}

        {step.name === 'signin' && <SignIn demo={demo} onLogin={onLogin} onUseEmail={(purpose) => setStep({ name: 'email', purpose })} />}
        {step.name === 'email' && (
          <AskCode purpose={step.purpose} onSent={(email, message) => setStep({ name: 'code', purpose: step.purpose, email, message })} />
        )}
        {step.name === 'code' && (
          <SetAccount
            purpose={step.purpose}
            email={step.email}
            message={step.message}
            onLogin={onLogin}
            onResend={() => setStep({ name: 'email', purpose: step.purpose })}
          />
        )}
      </motion.div>
    </main>
  )
}
