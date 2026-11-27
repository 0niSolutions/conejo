import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft, ChevronRight, Plus, X, ZoomIn, ZoomOut } from 'lucide-react'
import { QuantityStepper } from './Cart'
import { Illustration } from './ui'
import { useCart } from '../cart'
import { PRODUCTS, formatPrice } from '../data'

const ZOOM = 2.4
// Arrastre mínimo (en px) para pasar de foto con el dedo.
const SWIPE = 60

const ModalContext = createContext(null)

// Ficha ampliada de un producto. Se abre desde cualquier tarjeta del catálogo o foto destacada:
// `openProduct(item, { photo, index })`. `photo` es una foto extra (la del destacado) que se muestra primero.
export function ProductModalProvider({ children }) {
  const [state, setState] = useState(null)
  const openProduct = useCallback((item, { photo, index = 0 } = {}) => {
    const photos = photo && !item.photos.includes(photo) ? [photo, ...item.photos] : item.photos
    setState({ item, photos, index: photo ? Math.max(0, photos.indexOf(photo)) : index })
  }, [])
  const close = useCallback(() => setState(null), [])

  return (
    <ModalContext.Provider value={openProduct}>
      {children}
      <AnimatePresence>{state && <ProductModal key={state.item.id} {...state} onClose={close} />}</AnimatePresence>
    </ModalContext.Provider>
  )
}

export const useProductModal = () => useContext(ModalContext)

const NAV =
  'absolute top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-ink/70 text-bone backdrop-blur-sm transition-colors hover:bg-bone hover:text-ink'

function Viewer({ photos, index, setIndex, name, line }) {
  const [zoomed, setZoomed] = useState(false)
  const [origin, setOrigin] = useState('50% 50%')
  const frame = useRef(null)
  const count = photos.length
  const go = useCallback(
    (step) => {
      setZoomed(false)
      setIndex((current) => (current + step + count) % count)
    },
    [count, setIndex],
  )

  useEffect(() => {
    if (count < 2) return
    const onKeyDown = (event) => {
      if (event.key === 'ArrowLeft') go(-1)
      if (event.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [count, go])

  // El punto de la foto que queda bajo el puntero es el que se agranda.
  const aim = (event) => {
    const box = frame.current.getBoundingClientRect()
    setOrigin(`${((event.clientX - box.left) / box.width) * 100}% ${((event.clientY - box.top) / box.height) * 100}%`)
  }

  if (count === 0) {
    return (
      <div className="grid aspect-square place-items-center bg-coal">
        <Illustration product={line} play />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={frame}
        className={`relative mx-auto aspect-square w-full max-w-[78dvh] overflow-hidden rounded-2xl bg-ink select-none ${zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
        onPointerMove={(event) => zoomed && event.pointerType === 'mouse' && aim(event)}
      >
        <AnimatePresence initial={false} mode="popLayout">
          <motion.img
            key={photos[index]}
            src={photos[index]}
            alt={count > 1 ? `${name}, foto ${index + 1} de ${count}` : name}
            draggable={false}
            className="absolute inset-0 size-full object-contain"
            style={{ transformOrigin: origin }}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: zoomed ? ZOOM : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            drag={!zoomed && count > 1 ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.4}
            onDragEnd={(_, info) => Math.abs(info.offset.x) > SWIPE && go(info.offset.x < 0 ? 1 : -1)}
            onTap={(event) => {
              aim(event)
              setZoomed((value) => !value)
            }}
          />
        </AnimatePresence>

        <button
          type="button"
          aria-label={zoomed ? 'Alejar' : 'Acercar'}
          className="absolute top-3 right-3 z-10 grid size-10 place-items-center rounded-full bg-ink/70 text-bone backdrop-blur-sm transition-colors hover:bg-bone hover:text-ink"
          onClick={() => setZoomed((value) => !value)}
        >
          {zoomed ? <ZoomOut className="size-5" /> : <ZoomIn className="size-5" />}
        </button>

        {count > 1 && (
          <>
            <button type="button" aria-label="Foto anterior" className={`${NAV} left-3`} onClick={() => go(-1)}>
              <ChevronLeft className="size-5" />
            </button>
            <button type="button" aria-label="Foto siguiente" className={`${NAV} right-3`} onClick={() => go(1)}>
              <ChevronRight className="size-5" />
            </button>
            <p className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-ink/70 px-3 py-1 text-xs font-semibold tabular-nums backdrop-blur-sm">
              {index + 1} / {count}
            </p>
          </>
        )}
      </div>

      {count > 1 && (
        <ul className="no-scrollbar flex gap-2 overflow-x-auto">
          {photos.map((photo, i) => (
            <li key={photo} className="shrink-0">
              <button
                type="button"
                aria-label={`Ver foto ${i + 1}`}
                aria-current={i === index ? 'true' : undefined}
                className={`block size-16 overflow-hidden rounded-lg border-2 transition ${i === index ? 'border-bone' : 'border-transparent opacity-50 hover:opacity-100'}`}
                onClick={() => {
                  setZoomed(false)
                  setIndex(i)
                }}
              >
                <img src={photo} alt="" className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ProductModal({ item, photos, index: startIndex, onClose }) {
  const { quantities, setQuantity } = useCart()
  const [index, setIndex] = useState(startIndex)
  const dialog = useRef(null)
  const closeButton = useRef(null)
  const line = PRODUCTS.find(({ slug }) => slug === item.tag)
  const quantity = quantities[item.id] ?? 0

  useEffect(() => {
    const previousFocus = document.activeElement
    closeButton.current?.focus()
    document.documentElement.style.overflow = 'hidden'
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab') return
      const focusable = dialog.current.querySelectorAll('a[href], button')
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.documentElement.style.overflow = ''
      previousFocus?.focus?.()
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[46] flex items-end justify-center sm:items-center sm:p-6">
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 bg-ink/85 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label={item.name}
        className="relative max-h-[94dvh] w-full max-w-5xl overflow-y-auto overscroll-contain rounded-t-3xl border border-line bg-coal sm:rounded-3xl"
        initial={{ opacity: 0, y: 60, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.97 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <button
          ref={closeButton}
          type="button"
          aria-label="Cerrar"
          className="absolute top-3 left-3 z-20 grid size-10 place-items-center rounded-full bg-ink/70 text-bone backdrop-blur-sm transition-colors hover:bg-bone hover:text-ink"
          onClick={onClose}
        >
          <X className="size-5" />
        </button>

        <div className="grid gap-6 p-3 sm:p-5 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] md:gap-8">
          <Viewer photos={photos} index={index} setIndex={setIndex} name={item.name} line={line} />

          <div className="flex flex-col px-2 pb-4 md:py-6 md:pr-4">
            <a href={`/productos/${line.slug}`} onClick={onClose} className="w-fit text-xs tracking-wide text-ash uppercase transition-colors hover:text-bone">
              {line.name}
            </a>
            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">{item.name}</h2>
            {item.text && <p className="mt-3 text-ash">{item.text}</p>}
            <p className="mt-6 text-2xl font-semibold tabular-nums">{formatPrice(item.price)}</p>

            <div className="mt-6 h-12 md:mt-auto">
              {item.soldOut ? (
                <p className="flex size-full items-center justify-center rounded-full border border-line text-sm text-ash">Sin stock por ahora</p>
              ) : quantity === 0 ? (
                <motion.button
                  type="button"
                  className="flex size-full items-center justify-center gap-2 rounded-full bg-bone font-semibold text-ink transition-colors hover:bg-sun-1"
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setQuantity(item.id, 1)}
                >
                  <Plus className="size-4" /> Agregar al carrito
                </motion.button>
              ) : (
                <QuantityStepper name={item.name} quantity={quantity} onChange={(value) => setQuantity(item.id, value)} className="h-full" />
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
