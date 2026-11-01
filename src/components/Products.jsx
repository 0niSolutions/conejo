import { useRef } from 'react'
import { motion, useInView, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'motion/react'
import { ChevronRight } from 'lucide-react'
import { MagneticLink, SectionHeading, Stitch, WhatsAppIcon } from './ui'
import { INSTAGRAM_URL, PRODUCTS, WHATSAPP_URL } from '../data'

function Illustration({ product, play }) {
  return (
    <svg viewBox="0 0 200 200" aria-hidden="true" className="size-3/5 overflow-visible transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3">
      {product.lines.map((d, i) => (
        <motion.path
          key={d}
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: play ? 1 : 0 }}
          transition={{ duration: 1.1, delay: 0.15 + i * 0.14, ease: 'easeInOut' }}
        />
      ))}
      <g className="text-sun-1">
        <Stitch d={product.stitch} play={play} delay={0.9} duration={0.9} dash="6 5" />
      </g>
    </svg>
  )
}

function ProductCard({ product, index }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.3 })
  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)
  const rotateX = useSpring(useTransform(py, [0, 1], [8, -8]), { stiffness: 200, damping: 18 })
  const rotateY = useSpring(useTransform(px, [0, 1], [-10, 10]), { stiffness: 200, damping: 18 })
  const glowX = useTransform(px, [0, 1], ['0%', '100%'])
  const glowY = useTransform(py, [0, 1], ['0%', '100%'])
  const glow = useMotionTemplate`radial-gradient(circle at ${glowX} ${glowY}, rgba(242,162,79,.22), transparent 60%)`

  const onMove = (event) => {
    if (event.pointerType !== 'mouse') return
    const box = event.currentTarget.getBoundingClientRect()
    px.set((event.clientX - box.left) / box.width)
    py.set((event.clientY - box.top) / box.height)
  }
  const reset = () => {
    px.set(0.5)
    py.set(0.5)
  }

  return (
    <motion.li
      ref={ref}
      className="[perspective:900px]"
      initial={{ opacity: 0, y: 70, rotate: index % 2 ? 2.5 : -2.5 }}
      whileInView={{ opacity: 1, y: 0, rotate: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.8, delay: (index % 4) * 0.09, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noreferrer"
        onPointerMove={onMove}
        onPointerLeave={reset}
        style={{ rotateX, rotateY }}
        className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-coal transition-colors hover:border-ash"
      >
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: glow }}
        />
        <div className="grid aspect-square place-items-center overflow-hidden">
          {product.photo ? (
            <img src={product.photo} alt={product.name} loading="lazy" className="size-full object-cover grayscale transition duration-500 group-hover:scale-105 group-hover:grayscale-0" />
          ) : (
            <Illustration product={product} play={inView} />
          )}
        </div>
        <div className="relative flex flex-1 flex-col border-t border-line p-4 sm:p-5">
          <h3 className="text-base font-bold sm:text-lg">{product.name}</h3>
          <p className="mt-1 flex-1 text-sm text-ash">{product.text}</p>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold">
            Pedir <ChevronRight className="size-4 transition-transform group-hover:translate-x-1.5" />
          </span>
        </div>
      </motion.a>
    </motion.li>
  )
}

export default function Products() {
  return (
    <section id="productos" className="mx-auto max-w-7xl px-4 pb-24 sm:px-8 sm:pb-32">
      <SectionHeading
        action={
          <MagneticLink
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer"
            className="group inline-flex shrink-0 items-center gap-2 rounded-full border border-bone px-5 py-2.5 text-sm font-medium transition-colors hover:bg-bone hover:text-ink"
          >
            Ver más <ChevronRight className="size-4 transition-transform group-hover:translate-x-1" />
          </MagneticLink>
        }
      >
        Lo que hago
      </SectionHeading>

      <ul className="mt-10 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {PRODUCTS.map((product, i) => (
          <ProductCard key={product.name} product={product} index={i} />
        ))}
        <motion.li
          initial={{ opacity: 0, scale: 0.85 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, delay: 0.25 }}
        >
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="group flex h-full min-h-56 flex-col justify-between rounded-2xl bg-bone p-5 text-ink transition-colors hover:bg-sun-1"
          >
            <span className="font-brush text-3xl leading-tight sm:text-4xl">¿Buscás otra cosa?</span>
            <span className="inline-flex items-center gap-2 text-sm font-semibold">
              <WhatsAppIcon className="size-5 transition-transform group-hover:rotate-12" /> Escribime
            </span>
          </a>
        </motion.li>
      </ul>
    </section>
  )
}
