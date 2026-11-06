import { useRef, useState } from 'react'
import { AnimatePresence, motion, useInView } from 'motion/react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { QuantityStepper } from './Cart'
import { AskCard, Illustration, useTilt } from './ui'
import { useCart } from '../cart'
import { CATALOG, PRODUCTS, formatPrice } from '../data'

const ACCENTS = ['text-sun-1', 'text-sun-2', 'text-sun-3', 'text-bone']

const ARROW = 'absolute top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-ink/70 text-bone backdrop-blur-sm transition hover:bg-bone hover:text-ink focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100'

function Gallery({ photos, name }) {
  const [index, setIndex] = useState(0)
  const count = photos.length
  const current = Math.min(index, count - 1)
  const go = (step) => setIndex((current + step + count) % count)

  return (
    <div className="relative size-full">
      <AnimatePresence initial={false}>
        <motion.img
          key={photos[current]}
          src={photos[current]}
          alt={count > 1 ? `${name}, foto ${current + 1} de ${count}` : name}
          loading="lazy"
          className="absolute inset-0 size-full object-cover grayscale transition-[filter,scale] duration-500 group-hover:scale-105 group-hover:grayscale-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        />
      </AnimatePresence>
      {count > 1 && (
        <>
          <button type="button" aria-label="Foto anterior" className={`${ARROW} left-2`} onClick={() => go(-1)}>
            <ChevronLeft className="size-5" />
          </button>
          <button type="button" aria-label="Foto siguiente" className={`${ARROW} right-2`} onClick={() => go(1)}>
            <ChevronRight className="size-5" />
          </button>
          <div aria-hidden="true" className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {photos.map((photo, i) => (
              <span key={photo} className={`h-1.5 rounded-full bg-bone transition-all ${i === current ? 'w-4' : 'w-1.5 opacity-50'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function CatalogCard({ item }) {
  const { quantities, setQuantity } = useCart()
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.3 })
  const { glow, tilt } = useTilt()
  const line = PRODUCTS.find(({ slug }) => slug === item.tag)
  const quantity = quantities[item.id] ?? 0

  return (
    <div ref={ref} className="h-full [perspective:900px]">
      <motion.article {...tilt} className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-coal transition-colors hover:border-ash">
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: glow }}
        />
        <div className="relative grid aspect-square place-items-center overflow-hidden">
          {item.photos.length > 0 ? (
            <Gallery photos={item.photos} name={item.name} />
          ) : (
            <Illustration product={line} play={inView} accent={ACCENTS[CATALOG.indexOf(item) % ACCENTS.length]} />
          )}
          {item.soldOut && (
            <span className="absolute top-3 left-3 rounded-full bg-sun-2 px-3 py-1 text-xs font-bold tracking-wide text-bone uppercase">Sin stock</span>
          )}
        </div>
        <div className="relative flex flex-1 flex-col border-t border-line p-4 sm:p-5">
          <a href={`#/productos/${line.slug}`} className="w-fit text-xs tracking-wide text-ash uppercase transition-colors hover:text-bone">
            {line.name}
          </a>
          <h3 className="mt-1 text-base font-bold sm:text-lg">{item.name}</h3>
          <p className="mt-1 flex-1 text-sm text-ash">{item.text}</p>
          <p className="mt-3 text-lg font-semibold tabular-nums">{formatPrice(item.price)}</p>
          <div className="mt-3 h-11">
            <AnimatePresence mode="wait" initial={false}>
              {item.soldOut ? (
                <p key="sold-out" className="flex size-full items-center justify-center rounded-full border border-line text-sm text-ash">
                  Sin stock por ahora
                </p>
              ) : quantity === 0 ? (
                <motion.button
                  key="add"
                  type="button"
                  aria-label={`Agregar ${item.name} al carrito`}
                  className="flex size-full items-center justify-center gap-2 rounded-full bg-bone text-sm font-semibold text-ink transition-colors hover:bg-sun-1"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileTap={{ scale: 0.94 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => setQuantity(item.id, 1)}
                >
                  <Plus className="size-4" /> Agregar
                </motion.button>
              ) : (
                <motion.div key="stepper" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.15 }}>
                  <QuantityStepper name={item.name} quantity={quantity} onChange={(value) => setQuantity(item.id, value)} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.article>
    </div>
  )
}

function Filter({ href, label, active }) {
  return (
    <a
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`relative rounded-full border px-4 py-2 text-sm transition-colors ${active ? 'border-bone font-semibold text-ink' : 'border-line text-ash hover:border-ash hover:text-bone'}`}
    >
      {active && <motion.span layoutId="filter-pill" className="absolute inset-0 rounded-full bg-bone" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />}
      <span className="relative">{label}</span>
    </a>
  )
}

export default function Catalog({ tag }) {
  const line = PRODUCTS.find(({ slug }) => slug === tag)
  const items = line ? CATALOG.filter((item) => item.tag === line.slug) : CATALOG
  const title = line ? line.name : 'Productos'

  return (
    <section className="mx-auto max-w-7xl px-4 pt-32 pb-24 sm:px-8 sm:pt-40 sm:pb-32">
      <h1 key={title} aria-label={title} className="-rotate-2 font-brush text-5xl leading-none sm:text-7xl lg:text-8xl">
        {title.split(' ').map((word, w) => (
          <span key={w} className="inline-block pr-[0.25em] whitespace-nowrap">
            {word.split('').map((letter, i) => (
              <motion.span
                key={i}
                aria-hidden="true"
                className="inline-block"
                initial={{ y: 50, opacity: 0, rotate: -14 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 15, delay: w * 0.1 + i * 0.03 }}
              >
                {letter}
              </motion.span>
            ))}
          </span>
        ))}
      </h1>
      <p className="mt-5 text-ash">
        {items.length} productos. Agregá lo que quieras y enviá el pedido por WhatsApp.
      </p>

      <nav aria-label="Líneas de productos" className="mt-8 flex flex-wrap gap-2">
        <Filter href="#/productos" label="Todos" active={!line} />
        {PRODUCTS.map(({ slug, name }) => (
          <Filter key={slug} href={`#/productos/${slug}`} label={name} active={line?.slug === slug} />
        ))}
      </nav>

      <ul className="mt-10 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        <AnimatePresence mode="popLayout" initial={false}>
          {items.map((item, i) => (
            <motion.li
              key={item.id}
              layout
              initial={{ opacity: 0, y: 40, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.45, delay: Math.min(i, 7) * 0.04, ease: [0.22, 1, 0.36, 1] }}
            >
              <CatalogCard item={item} />
            </motion.li>
          ))}
          <motion.li key="ask" layout transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
            <AskCard />
          </motion.li>
        </AnimatePresence>
      </ul>
    </section>
  )
}
