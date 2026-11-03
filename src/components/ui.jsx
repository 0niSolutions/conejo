import { useEffect, useId, useRef } from 'react'
import { animate, motion, useInView, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'motion/react'
import { WHATSAPP_URL } from '../data'

export function InstagramIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function WhatsAppIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M3.5 20.5 5 16a8.5 8.5 0 1 1 3.2 3.1z" />
      <path strokeWidth="1.5" d="M9 8.5c-.6 2.8 3.4 7 6.5 6.5l.8-1.6-2-1-.9.8c-.9-.4-1.9-1.4-2.2-2.2l.8-.9-1-2z" />
    </svg>
  )
}

// El botón se acerca al puntero mientras está encima.
export function MagneticLink({ children, strength = 0.3, ...props }) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 220, damping: 16 })
  const springY = useSpring(y, { stiffness: 220, damping: 16 })

  const onMove = (event) => {
    if (event.pointerType !== 'mouse') return
    const box = event.currentTarget.getBoundingClientRect()
    x.set((event.clientX - box.left - box.width / 2) * strength)
    y.set((event.clientY - box.top - box.height / 2) * strength)
  }
  const reset = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.a style={{ x: springX, y: springY }} whileTap={{ scale: 0.95 }} onPointerMove={onMove} onPointerLeave={reset} {...props}>
      {children}
    </motion.a>
  )
}

// Costura: una línea punteada que se revela con una máscara, como si se fuera cosiendo.
export function Stitch({ d, size = 200, delay = 0, duration = 1.4, play = true, width = 2, dash = '9 7' }) {
  const id = useId()
  return (
    <>
      <mask id={id} maskUnits="userSpaceOnUse" x="-20" y="-20" width={size + 40} height={size + 40}>
        <motion.path
          d={d}
          fill="none"
          stroke="#fff"
          strokeWidth={width + 6}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: play ? 1 : 0 }}
          transition={{ duration, delay, ease: 'easeInOut' }}
        />
      </mask>
      <g mask={`url(#${id})`}>
        <path d={d} fill="none" stroke="currentColor" strokeWidth={width} strokeDasharray={dash} strokeLinecap="round" />
      </g>
    </>
  )
}

// Dibujo de una línea de productos: el trazo se dibuja y la costura se cose encima.
export function Illustration({ product, play, accent = 'text-sun-1' }) {
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
      <g className={accent}>
        <Stitch d={product.stitch} play={play} delay={0.9} duration={0.9} dash="6 5" />
      </g>
    </svg>
  )
}

// La tarjeta se inclina hacia el puntero y un brillo lo sigue.
export function useTilt() {
  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)
  const rotateX = useSpring(useTransform(py, [0, 1], [8, -8]), { stiffness: 200, damping: 18 })
  const rotateY = useSpring(useTransform(px, [0, 1], [-10, 10]), { stiffness: 200, damping: 18 })
  const glowX = useTransform(px, [0, 1], ['0%', '100%'])
  const glowY = useTransform(py, [0, 1], ['0%', '100%'])
  const glow = useMotionTemplate`radial-gradient(circle at ${glowX} ${glowY}, rgba(242,162,79,.22), transparent 60%)`

  const onPointerMove = (event) => {
    if (event.pointerType !== 'mouse') return
    const box = event.currentTarget.getBoundingClientRect()
    px.set((event.clientX - box.left) / box.width)
    py.set((event.clientY - box.top) / box.height)
  }
  const onPointerLeave = () => {
    px.set(0.5)
    py.set(0.5)
  }

  return { glow, tilt: { style: { rotateX, rotateY }, onPointerMove, onPointerLeave } }
}

export function AskCard() {
  return (
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
  )
}

export function CountUp({ to, suffix = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })

  useEffect(() => {
    if (!inView) return
    const controls = animate(0, to, {
      duration: 1.8,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (value) => {
        if (ref.current) ref.current.textContent = Math.round(value).toLocaleString('es-AR') + suffix
      },
    })
    return () => controls.stop()
  }, [inView, to, suffix])

  return <span ref={ref}>{to.toLocaleString('es-AR') + suffix}</span>
}

export function SectionHeading({ children, action }) {
  return (
    <div className="flex items-center gap-5 sm:gap-8">
      <motion.h2
        className="shrink-0 text-3xl font-bold tracking-tight sm:text-4xl"
        initial={{ opacity: 0, x: -30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, amount: 0.8 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.h2>
      <motion.span
        aria-hidden="true"
        className="h-px flex-1 origin-left bg-ash/60"
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      />
      {action}
    </div>
  )
}
