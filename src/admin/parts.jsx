import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowLeft, ArrowRight, ImagePlus, LoaderCircle, Star, X } from 'lucide-react'
import { DEFAULT_ART } from '../data'
import { uploadPhoto } from './api'

export const INPUT =
  'w-full rounded-xl border border-line bg-ink px-3.5 py-2.5 text-bone placeholder:text-ash/60 transition-colors hover:border-ash focus:border-bone focus:outline-none'
export const BUTTON = 'inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50'
export const PRIMARY = `${BUTTON} bg-bone text-ink hover:bg-sun-1`
export const SECONDARY = `${BUTTON} border border-line text-bone hover:border-bone`
export const ICON_BUTTON = 'grid size-9 shrink-0 place-items-center rounded-full text-ash transition-colors hover:bg-bone hover:text-ink disabled:pointer-events-none disabled:opacity-25'

export function Field({ label, hint, error, children }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <div className="mt-1.5">{children}</div>
      {error ? <span className="mt-1.5 block text-sm text-sun-2">{error}</span> : hint && <span className="mt-1.5 block text-sm text-ash">{hint}</span>}
    </label>
  )
}

export function Toggle({ label, hint, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-line p-3.5 transition-colors hover:border-ash">
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-sm text-ash">{hint}</span>
      </span>
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span
        aria-hidden="true"
        className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full bg-line transition-colors peer-checked:bg-sun-1 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sun-1 after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-bone after:transition-transform peer-checked:after:translate-x-5"
      />
    </label>
  )
}

export function Badge({ children, tone = 'ash' }) {
  const tones = { ash: 'border-line text-ash', sun: 'border-sun-2/50 text-sun-2', blue: 'border-sun-3/50 text-sun-3' }
  return <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${tones[tone]}`}>{children}</span>
}

// Miniatura: la foto, o el dibujo de la línea si no tiene.
export function Thumb({ photo, art, className = 'size-14' }) {
  const { lines, stitch } = art ?? DEFAULT_ART
  return (
    <span className={`grid shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-coal ${className}`}>
      {photo ? (
        <img src={photo} alt="" className="size-full object-cover" />
      ) : (
        <svg viewBox="0 0 200 200" aria-hidden="true" className="size-full p-1.5" fill="none" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
          {lines.map((d) => (
            <path key={d} d={d} stroke="currentColor" />
          ))}
          <path d={stitch} stroke="var(--color-sun-1)" strokeDasharray="12 10" />
        </svg>
      )}
    </span>
  )
}

// Panel lateral con el formulario. Escape cierra y el foco vuelve a donde estaba.
export function Drawer({ title, onClose, footer, children }) {
  const panel = useRef(null)
  const close = useRef(onClose)
  close.current = onClose

  useEffect(() => {
    const previousFocus = document.activeElement
    panel.current.querySelector('input:not(.sr-only), textarea, select')?.focus()
    document.documentElement.style.overflow = 'hidden'
    const onKeyDown = (event) => {
      if (event.key === 'Escape') close.current()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.documentElement.style.overflow = ''
      previousFocus?.focus?.()
    }
  }, [])

  return (
    <div className="fixed inset-0 z-40">
      <motion.div aria-hidden="true" className="absolute inset-0 bg-ink/70 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => close.current()} />
      <motion.aside
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col border-l border-line bg-coal"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button type="button" aria-label="Cerrar" className={ICON_BUTTON} onClick={() => close.current()}>
            <X className="size-5" />
          </button>
        </header>
        <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-5">{children}</div>
        <footer className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-4">{footer}</footer>
      </motion.aside>
    </div>
  )
}

// Sube fotos (las comprime antes) y permite ordenarlas. La primera es la principal.
export function PhotoPicker({ photos, setPhotos, name, multiple = true, onUploadingChange }) {
  const input = useRef(null)
  const [uploading, setUploading] = useState(0)
  const [errors, setErrors] = useState([])
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    onUploadingChange?.(uploading > 0)
  }, [uploading, onUploadingChange])

  async function addFiles(fileList) {
    const files = [...fileList].slice(0, multiple ? undefined : 1)
    if (files.length === 0) return
    setErrors([])
    setUploading((n) => n + files.length)
    const results = await Promise.allSettled(files.map((file) => uploadPhoto(file, name || 'foto')))
    setUploading((n) => n - files.length)
    const uploaded = results.filter((r) => r.status === 'fulfilled').map((r) => r.value)
    setErrors(results.filter((r) => r.status === 'rejected').map((r) => r.reason.message))
    if (uploaded.length) setPhotos((current) => (multiple ? [...current, ...uploaded] : uploaded.slice(0, 1)))
  }

  const move = (from, to) =>
    setPhotos((current) => {
      const next = [...current]
      next.splice(to, 0, next.splice(from, 1)[0])
      return next
    })

  return (
    <div>
      {photos.length > 0 && (
        <ul className={`mb-3 grid gap-3 ${multiple ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'}`}>
          {photos.map((photo, i) => (
            <li key={photo} className="overflow-hidden rounded-xl border border-line bg-ink">
              <div className="relative aspect-square">
                <img src={photo} alt={`Foto ${i + 1}`} className="size-full object-cover" />
                {multiple && i === 0 && (
                  <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-bone px-2 py-0.5 text-xs font-bold text-ink">
                    <Star className="size-3 fill-current" /> Principal
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between p-1">
                {multiple ? (
                  <>
                    <button type="button" aria-label={`Mover foto ${i + 1} a la izquierda`} className={ICON_BUTTON} disabled={i === 0} onClick={() => move(i, i - 1)}>
                      <ArrowLeft className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Hacer principal la foto ${i + 1}`}
                      title="Hacer principal"
                      className={ICON_BUTTON}
                      disabled={i === 0}
                      onClick={() => move(i, 0)}
                    >
                      <Star className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Mover foto ${i + 1} a la derecha`}
                      className={ICON_BUTTON}
                      disabled={i === photos.length - 1}
                      onClick={() => move(i, i + 1)}
                    >
                      <ArrowRight className="size-4" />
                    </button>
                  </>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  aria-label={`Quitar foto ${i + 1}`}
                  className={`${ICON_BUTTON} hover:bg-sun-2 hover:text-bone`}
                  onClick={() => setPhotos((current) => current.filter((p) => p !== photo))}
                >
                  <X className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {(multiple || photos.length === 0) && (
        <button
          type="button"
          className={`flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${dragging ? 'border-sun-1 bg-sun-1/10' : 'border-line hover:border-ash'}`}
          onClick={() => input.current.click()}
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            addFiles(event.dataTransfer.files)
          }}
        >
          {uploading > 0 ? <LoaderCircle className="size-7 animate-spin text-sun-1" /> : <ImagePlus className="size-7 text-ash" />}
          <span className="text-sm font-semibold">
            {uploading > 0 ? `Subiendo ${uploading} ${uploading === 1 ? 'foto' : 'fotos'}…` : multiple ? 'Agregar fotos' : 'Agregar foto'}
          </span>
          <span className="text-xs text-ash">Hacé clic o arrastralas acá. Se achican y comprimen solas.</span>
        </button>
      )}
      {!multiple && photos.length > 0 && <p className="text-sm text-ash">Para cambiarla, quitá la actual y subí otra.</p>}
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={(event) => {
          addFiles(event.target.files)
          event.target.value = ''
        }}
      />
      {errors.map((error) => (
        <p key={error} role="alert" className="mt-2 text-sm text-sun-2">
          {error}
        </p>
      ))}
    </div>
  )
}
