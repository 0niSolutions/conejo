import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useProductModal } from './ProductModal'
import { MagneticLink, SectionHeading } from './ui'
import { FEATURED } from '../data'

const AUTOPLAY_MS = 4500
// Después de que alguien toca el carrete, espera un rato antes de volver a moverlo solo.
const IDLE_AFTER_TOUCH_MS = 8000

const ARROW =
  'grid size-11 place-items-center rounded-full border border-bone transition-colors hover:bg-bone hover:text-ink disabled:pointer-events-none disabled:opacity-25'

// Solo la foto: sin nombre ni precio. Al tocarla se abre la ficha del producto.
function FeaturedPhoto({ photo, item }) {
  const openProduct = useProductModal()
  return (
    <button
      type="button"
      aria-label={`Ver ${item.name}`}
      className="group relative block aspect-square w-full overflow-hidden rounded-2xl border border-line bg-coal transition-colors hover:border-ash"
      onClick={() => openProduct(item, { photo })}
    >
      <img src={photo} alt={item.name} loading="lazy" draggable={false} className="size-full object-cover grayscale transition duration-700 group-hover:scale-105 group-hover:grayscale-0" />
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 to-transparent px-4 pt-10 pb-4 text-left text-sm font-semibold opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      >
        Ver producto
      </span>
    </button>
  )
}

function Carousel({ items }) {
  const track = useRef(null)
  const [edges, setEdges] = useState({ start: true, end: false })
  const reducedMotion = useReducedMotion()
  const hovering = useRef(false)
  const visible = useRef(false)
  const lastTouch = useRef(0)

  const updateEdges = useCallback(() => {
    const el = track.current
    if (!el) return
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 })
  }, [])

  // Avanza de a una tarjeta (el ancho de la primera más el espacio entre tarjetas).
  const step = useCallback((direction) => {
    const el = track.current
    const card = el?.firstElementChild
    if (!card) return
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0
    el.scrollBy({ left: direction * (card.offsetWidth + gap), behavior: 'smooth' })
  }, [])

  const touched = () => {
    lastTouch.current = Date.now()
  }

  useEffect(() => {
    const el = track.current
    updateEdges()
    const resize = new ResizeObserver(updateEdges)
    resize.observe(el)
    const observer = new IntersectionObserver(([entry]) => (visible.current = entry.isIntersecting), { threshold: 0.4 })
    observer.observe(el)
    return () => {
      resize.disconnect()
      observer.disconnect()
    }
  }, [updateEdges])

  // Se mueve solo mientras está en pantalla y nadie lo está usando. Al llegar al final vuelve al principio.
  useEffect(() => {
    if (reducedMotion) return
    const timer = setInterval(() => {
      const el = track.current
      const busy = hovering.current || el.contains(document.activeElement) || Date.now() - lastTouch.current < IDLE_AFTER_TOUCH_MS
      if (!visible.current || busy || document.hidden) return
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) el.scrollTo({ left: 0, behavior: 'smooth' })
      else step(1)
    }, AUTOPLAY_MS)
    return () => clearInterval(timer)
  }, [reducedMotion, step])

  const arrows = items.length > 4 && (
    <div className="hidden shrink-0 gap-2 sm:flex">
      <button
        type="button"
        aria-label="Destacados anteriores"
        className={ARROW}
        disabled={edges.start}
        onClick={() => {
          touched()
          step(-1)
        }}
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        type="button"
        aria-label="Destacados siguientes"
        className={ARROW}
        disabled={edges.end}
        onClick={() => {
          touched()
          step(1)
        }}
      >
        <ChevronRight className="size-5" />
      </button>
    </div>
  )

  return (
    <>
      <SectionHeading
        action={
          <div className="flex shrink-0 items-center gap-3">
            {arrows}
            <MagneticLink
              href="#/productos"
              className="group inline-flex shrink-0 items-center gap-2 rounded-full border border-bone px-5 py-2.5 text-sm font-medium transition-colors hover:bg-bone hover:text-ink"
            >
              Ver más <ChevronRight className="size-4 transition-transform group-hover:translate-x-1" />
            </MagneticLink>
          </div>
        }
      >
        Lo último
      </SectionHeading>

      <ul
        ref={track}
        aria-label="Lo último"
        className="no-scrollbar -mx-4 mt-8 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 py-2 sm:-mx-8 sm:mt-10 sm:scroll-px-8 sm:gap-5 sm:px-8"
        onScroll={updateEdges}
        onPointerEnter={(event) => event.pointerType === 'mouse' && (hovering.current = true)}
        onPointerLeave={() => (hovering.current = false)}
        onPointerDown={touched}
        onWheel={touched}
        onTouchStart={touched}
      >
        {items.map((entry, i) => (
          <motion.li
            key={entry.photo}
            className="w-[72%] shrink-0 snap-start sm:w-[calc((100%-2.5rem)/3)] lg:w-[calc((100%-3.75rem)/4)]"
            initial={{ opacity: 0, y: 60, rotate: i % 2 ? 2.5 : -2.5 }}
            whileInView={{ opacity: 1, y: 0, rotate: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.8, delay: Math.min(i, 3) * 0.09, ease: [0.22, 1, 0.36, 1] }}
          >
            <FeaturedPhoto {...entry} />
          </motion.li>
        ))}
      </ul>
    </>
  )
}

// Carrete de fotos destacadas, abajo de "Sobre mí". Se cargan y ordenan desde el panel (pestaña Destacados).
export default function Featured() {
  if (FEATURED.length === 0) return null
  return (
    <section id="destacados" className="mx-auto max-w-7xl px-4 pb-20 sm:px-8 sm:pb-28">
      <Carousel items={FEATURED} />
    </section>
  )
}
