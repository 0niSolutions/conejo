import { useRef } from 'react'
import { motion, useMotionValue, useScroll, useSpring, useTransform } from 'motion/react'
import { ChevronRight } from 'lucide-react'
import Backpack from './Backpack'
import { InstagramIcon, MagneticLink, WhatsAppIcon } from './ui'
import { INSTAGRAM_URL, WHATSAPP_URL } from '../data'

const TITLE = 'Conejo'
const TAGLINE = ['Artesanal', 'Hecho a mano', 'Salteño']

const STREAKS = [
  ['top-[8%] -right-[8%] h-20 w-[85%] sm:h-28', 0.15],
  ['top-[40%] -right-[12%] h-28 w-full sm:h-40', 0.3],
  ['top-[72%] -right-[6%] h-14 w-[70%] sm:h-20', 0.45],
]

const SPLATTER = Array.from({ length: 34 }, (_, i) => ({
  x: 8 + ((i * 53) % 86),
  y: 6 + ((i * 37) % 86),
  size: 2 + ((i * 7) % 11),
  delay: 0.6 + (i % 9) * 0.05,
}))

export default function Hero({ play }) {
  const section = useRef(null)
  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end start'] })
  const titleY = useTransform(scrollYProgress, [0, 1], [0, -90])
  const packY = useTransform(scrollYProgress, [0, 1], [0, 130])
  const streakY = useTransform(scrollYProgress, [0, 1], [0, 220])
  const streakFade = useTransform(scrollYProgress, [0.55, 1], [1, 0])

  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)
  const rotateY = useSpring(useTransform(pointerX, [-0.5, 0.5], [-14, 14]), { stiffness: 90, damping: 16 })
  const rotateX = useSpring(useTransform(pointerY, [-0.5, 0.5], [9, -9]), { stiffness: 90, damping: 16 })
  const splatterX = useSpring(useTransform(pointerX, [-0.5, 0.5], [18, -18]), { stiffness: 60, damping: 14 })

  const onPointerMove = (event) => {
    if (event.pointerType !== 'mouse') return
    pointerX.set(event.clientX / window.innerWidth - 0.5)
    pointerY.set(event.clientY / window.innerHeight - 0.5)
  }

  return (
    <section
      ref={section}
      id="inicio"
      onPointerMove={onPointerMove}
      className="relative flex min-h-svh flex-col overflow-hidden pt-24 lg:flex-row lg:items-center lg:pt-20"
    >
      <motion.div aria-hidden="true" style={{ y: streakY, opacity: streakFade }} className="absolute top-[52%] right-0 bottom-0 w-full lg:top-0 lg:w-3/5">
        <svg className="absolute size-0">
          <filter id="brush-edge">
            <feTurbulence type="fractalNoise" baseFrequency="0.018 0.11" numOctaves="4" seed="8" />
            <feDisplacementMap in="SourceGraphic" scale="46" />
          </filter>
        </svg>
        {STREAKS.map(([position, delay]) => (
          <div key={position} className={`absolute -rotate-[52deg] ${position}`}>
            <motion.div
              className="size-full"
              initial={{ clipPath: 'inset(0 100% 0 0)' }}
              animate={play ? { clipPath: 'inset(0 0% 0 0)' } : {}}
              transition={{ duration: 0.8, delay, ease: [0.76, 0, 0.24, 1] }}
            >
              <div className="size-full bg-[#bdbdbd]/70" style={{ filter: 'url(#brush-edge)' }} />
            </motion.div>
          </div>
        ))}
        <motion.div className="absolute inset-0" style={{ x: splatterX }}>
          {SPLATTER.map((dot, i) => (
            <motion.span
              key={i}
              className="absolute rounded-full bg-bone/70"
              style={{ left: `${dot.x}%`, top: `${dot.y}%`, width: dot.size, height: dot.size }}
              initial={{ scale: 0 }}
              animate={play ? { scale: 1 } : {}}
              transition={{ type: 'spring', stiffness: 300, damping: 12, delay: dot.delay }}
            />
          ))}
        </motion.div>
      </motion.div>

      {/* Ocupa todo el ancho por encima de la mochila: solo los botones y las letras reciben el puntero. */}
      <motion.div style={{ y: titleY }} className="pointer-events-none relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-8 [&_a]:pointer-events-auto [&_h1_span]:pointer-events-auto">
        <h1 aria-label={TITLE} className="-rotate-3 font-brush text-[17vw] leading-none sm:text-[7.5rem] xl:text-[8.5rem]">
          {TITLE.split('').map((letter, i) => (
            <motion.span
              key={i}
              aria-hidden="true"
              className="inline-block"
              initial={{ y: 90, opacity: 0, rotate: -18, scale: 1.4 }}
              animate={play ? { y: 0, opacity: 1, rotate: 0, scale: 1 } : {}}
              whileHover={{ y: -12, rotate: -6, color: '#f2a24f' }}
              transition={{ type: 'spring', stiffness: 260, damping: 14, delay: play ? 0.15 + i * 0.06 : 0 }}
            >
              {letter}
            </motion.span>
          ))}
        </h1>

        <svg viewBox="0 0 520 34" aria-hidden="true" className="-mt-1 ml-[6%] w-[78%] max-w-xl sm:-mt-2">
          <motion.path
            d="M6 28Q200 8 512 7Q330 14 150 30"
            fill="none"
            stroke="#f4f1ea"
            strokeWidth="6"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={play ? { pathLength: 1 } : {}}
            transition={{ duration: 0.9, delay: 0.8, ease: 'easeInOut' }}
          />
        </svg>

        <motion.p
          className="mt-5 text-lg font-medium sm:text-xl"
          initial={{ opacity: 0, y: 16 }}
          animate={play ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 1.05 }}
        >
          Marroquinería artesanal desde Salta Capital
        </motion.p>

        <ul className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tracking-[0.3em] text-ash uppercase sm:gap-x-5 sm:text-sm sm:tracking-[0.4em]">
          {TAGLINE.map((word, i) => (
            <motion.li
              key={word}
              className="flex items-center gap-3 sm:gap-5"
              initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }}
              animate={play ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
              transition={{ duration: 0.6, delay: 1.2 + i * 0.14 }}
            >
              {word}
              {i < TAGLINE.length - 1 && <span aria-hidden="true">•</span>}
            </motion.li>
          ))}
        </ul>

        <motion.div
          className="mt-8 flex flex-wrap gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={play ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 1.6 }}
        >
          <MagneticLink
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="group inline-flex items-center gap-3 rounded-full bg-bone px-6 py-3.5 font-semibold text-ink"
          >
            <WhatsAppIcon className="size-5" /> Pedí el tuyo
            <ChevronRight className="size-5 transition-transform group-hover:translate-x-1" />
          </MagneticLink>
          <MagneticLink
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-3 rounded-full border border-bone bg-ink/40 px-6 py-3.5 font-medium backdrop-blur-sm transition-colors hover:bg-bone hover:text-ink"
          >
            <InstagramIcon className="size-5" /> Seguime en Instagram
          </MagneticLink>
        </motion.div>
      </motion.div>

      <motion.div
        style={{ y: packY }}
        className="pointer-events-none relative mx-auto mt-6 h-[58vh] w-full max-w-md shrink-0 [perspective:1100px] lg:absolute lg:right-[4%] lg:mt-0 lg:h-[84vh] lg:w-[42%] lg:max-w-none xl:right-[7%]"
      >
        <motion.div
          className="size-full"
          style={{ rotateX, rotateY }}
          initial={{ opacity: 0, x: 140, scale: 0.86 }}
          animate={play ? { opacity: 1, x: 0, scale: 1 } : {}}
          transition={{ duration: 1.1, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="size-full"
            animate={{ y: [0, -14, 0], rotate: [-1, 1, -1] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Backpack play={play} />
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  )
}
