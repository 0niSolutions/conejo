import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react'
import { MagneticLink, WhatsAppIcon } from './ui'
import { useCart } from '../cart'
import { PRODUCTS, formatPrice } from '../data'

export function QuantityStepper({ name, quantity, onChange, className = '' }) {
  return (
    <div className={`flex items-center justify-between gap-1 rounded-full border border-line ${className}`}>
      <motion.button
        type="button"
        aria-label={`Quitar uno de ${name}`}
        className="grid size-10 place-items-center rounded-full transition-colors hover:bg-bone hover:text-ink"
        whileTap={{ scale: 0.85 }}
        onClick={() => onChange(quantity - 1)}
      >
        <Minus className="size-4" />
      </motion.button>
      <span className="min-w-6 text-center text-sm font-semibold tabular-nums" aria-live="polite">
        {quantity}
      </span>
      <motion.button
        type="button"
        aria-label={`Agregar uno de ${name}`}
        className="grid size-10 place-items-center rounded-full transition-colors hover:bg-bone hover:text-ink"
        whileTap={{ scale: 0.85 }}
        onClick={() => onChange(quantity + 1)}
      >
        <Plus className="size-4" />
      </motion.button>
    </div>
  )
}

function Panel() {
  const { lines, total, setQuantity, clear, setOpen, whatsappUrl } = useCart()
  const panel = useRef(null)
  const closeButton = useRef(null)

  useEffect(() => {
    const previousFocus = document.activeElement
    closeButton.current?.focus()
    document.documentElement.style.overflow = 'hidden'

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
      if (event.key !== 'Tab') return
      const focusable = panel.current.querySelectorAll('a[href], button')
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
  }, [setOpen])

  return (
    <div className="fixed inset-0 z-[45]">
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 bg-ink/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setOpen(false)}
      />
      <motion.aside
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Carrito"
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-line bg-coal"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-brush text-3xl">Tu carrito</h2>
          <button
            ref={closeButton}
            type="button"
            aria-label="Cerrar carrito"
            className="grid size-11 place-items-center rounded-full transition-colors hover:bg-bone hover:text-ink"
            onClick={() => setOpen(false)}
          >
            <X />
          </button>
        </header>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
            <motion.span initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 12, delay: 0.2 }}>
              <ShoppingBag className="size-14 text-ash" strokeWidth={1.25} />
            </motion.span>
            <p className="text-ash">Todavía no agregaste nada.</p>
            <a
              href="#/productos"
              onClick={() => setOpen(false)}
              className="rounded-full border border-bone px-5 py-2.5 text-sm font-medium transition-colors hover:bg-bone hover:text-ink"
            >
              Ver productos
            </a>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-line overflow-y-auto overscroll-contain px-5">
              <AnimatePresence initial={false}>
                {lines.map(({ product, quantity }) => (
                  <motion.li
                    key={product.id}
                    layout
                    className="overflow-hidden"
                    exit={{ opacity: 0, height: 0, x: 60 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs tracking-wide text-ash uppercase">{PRODUCTS.find(({ slug }) => slug === product.tag)?.name}</p>
                          <h3 className="font-bold">{product.name}</h3>
                          <p className="text-sm text-ash">{formatPrice(product.price)} c/u</p>
                        </div>
                        <p className="shrink-0 font-semibold tabular-nums">{formatPrice(product.price * quantity)}</p>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <QuantityStepper name={product.name} quantity={quantity} onChange={(value) => setQuantity(product.id, value)} />
                        <button
                          type="button"
                          aria-label={`Sacar ${product.name} del carrito`}
                          className="grid size-10 place-items-center rounded-full text-ash transition-colors hover:text-sun-2"
                          onClick={() => setQuantity(product.id, 0)}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>

            <footer className="border-t border-line p-5">
              <div aria-hidden="true" className="stitch-line mb-4 h-0.5 text-sun-1" />
              <div className="flex items-baseline justify-between">
                <span className="text-ash">Total</span>
                <span className="font-brush text-4xl tabular-nums">{formatPrice(total)}</span>
              </div>
              <MagneticLink
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                strength={0.12}
                className="wa-pulse relative mt-4 flex items-center justify-center gap-3 rounded-full bg-bone px-6 py-4 font-semibold text-ink"
              >
                <WhatsAppIcon className="size-6" /> Enviar pedido por WhatsApp
              </MagneticLink>
              <p className="mt-3 text-center text-xs text-ash">No cobramos en la web: el pago y la entrega se coordinan por WhatsApp.</p>
              <button type="button" className="mx-auto mt-2 block px-3 py-2 text-sm text-ash underline underline-offset-4 transition-colors hover:text-bone" onClick={clear}>
                Vaciar carrito
              </button>
            </footer>
          </>
        )}
      </motion.aside>
    </div>
  )
}

export default function Cart() {
  const { open } = useCart()
  return <AnimatePresence>{open && <Panel />}</AnimatePresence>
}
