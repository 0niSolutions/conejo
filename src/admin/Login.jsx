import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Eye, EyeOff, LoaderCircle, LockKeyhole } from 'lucide-react'
import { login } from './api'
import { Field, INPUT, PRIMARY } from './parts'

export default function Login({ onLogin, notice }) {
  const [user, setUser] = useState('')
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState(null)
  const [sending, setSending] = useState(false)
  const input = useRef(null)

  useEffect(() => {
    document.title = 'Entrar · Panel · Conejo'
    input.current?.focus()
  }, [])

  async function submit(event) {
    event.preventDefault()
    if (!user.trim() || !password) {
      setError(!user.trim() ? 'Escribí tu usuario.' : 'Escribí la contraseña.')
      return
    }
    setSending(true)
    setError(null)
    try {
      await login(user, password)
      onLogin()
    } catch (failure) {
      setError(failure.message)
      setPassword('')
      setSending(false)
      input.current?.focus()
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <motion.form
        onSubmit={submit}
        className="w-full max-w-sm rounded-3xl border border-line p-8"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        noValidate
      >
        <LockKeyhole className="size-8 text-sun-1" />
        <h1 className="mt-4 font-brush text-3xl leading-none">Panel</h1>
        <p className="mt-2 text-sm text-ash">Entrá con tu usuario y contraseña de administrador.</p>
        {notice && <p className="mt-4 rounded-xl border border-line px-3.5 py-2.5 text-sm text-ash">{notice}</p>}

        <div className="mt-6 space-y-4">
          <Field label="Usuario">
            <input
              ref={input}
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
            <div className="relative">
              <input
                type={visible ? 'text' : 'password'}
                autoComplete="current-password"
                className={`${INPUT} pr-11`}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={Boolean(error)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 grid w-11 place-items-center text-ash hover:text-bone"
                aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                onClick={() => setVisible((value) => !value)}
              >
                {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </Field>
        </div>

        <button type="submit" className={`${PRIMARY} mt-6 w-full`} disabled={sending}>
          {sending && <LoaderCircle className="size-4 animate-spin" />}
          Entrar
        </button>
      </motion.form>
    </main>
  )
}
