import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import { InstagramIcon, SectionHeading, WhatsAppIcon } from './ui'
import { INSTAGRAM_URL, WHATSAPP_URL } from '../data'
import video from '../assets/yo-web.mp4'
import poster from '../assets/yo-portada-web.jpg'

const TEXT =
  'Hago marroquinería artesanal desde Salta Capital. Riñoneras, mochilas, bolsos, fundas de guitarra, materos y más: cada pieza está hecha a mano, una por una. Si buscás el tuyo, escribime, atiendo todos los días.'

const SOCIALS = [
  { label: 'Instagram', href: INSTAGRAM_URL, Icon: InstagramIcon },
  { label: 'WhatsApp', href: WHATSAPP_URL, Icon: WhatsAppIcon },
]

function Word({ children, progress, range }) {
  const opacity = useTransform(progress, range, [0.16, 1])
  return <motion.span style={{ opacity }}>{children} </motion.span>
}

const ROUND_BTN =
  'grid size-10 place-items-center rounded-full border border-bone/30 bg-ink/50 text-bone backdrop-blur-sm transition-colors hover:bg-bone hover:text-ink'

function VideoCard() {
  const ref = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)
  const userPaused = useRef(false)

  // Se reproduce solo (sin sonido) cuando está en pantalla y se pausa al salir
  useEffect(() => {
    const el = ref.current
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !userPaused.current) el.play().catch(() => {})
        else if (!entry.isIntersecting) el.pause()
      },
      { threshold: 0.4 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const togglePlay = () => {
    const el = ref.current
    if (el.paused) {
      userPaused.current = false
      el.play().catch(() => {})
    } else {
      userPaused.current = true
      el.pause()
    }
  }

  const toggleMute = () => {
    const el = ref.current
    el.muted = !el.muted
    setMuted(el.muted)
    if (!el.muted && el.paused) togglePlay()
  }

  return (
    <motion.div
      className="relative mx-auto w-full max-w-sm pr-4 pb-4"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6 }}
    >
      {/* Marco desplazado detrás del video */}
      <div aria-hidden="true" className="absolute inset-0 top-4 left-4 rounded-4xl border border-ash/40" />

      <div className="relative overflow-hidden rounded-4xl border border-line bg-ink shadow-2xl">
        <video
          ref={ref}
          className="block aspect-9/16 w-full object-cover"
          src={video}
          poster={poster}
          muted
          loop
          playsInline
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />

        {muted && (
          <button
            type="button"
            onClick={toggleMute}
            className="absolute top-4 left-4 flex items-center gap-2 rounded-full bg-ink/60 px-3 py-1.5 text-[11px] font-semibold tracking-wider text-bone uppercase backdrop-blur-sm transition-colors hover:bg-bone hover:text-ink"
          >
            <span className="size-2 animate-pulse rounded-full bg-amber-300" />
            Activar sonido
          </button>
        )}

        <div className="absolute right-4 bottom-4 flex gap-2">
          <button type="button" onClick={togglePlay} className={ROUND_BTN} aria-label={playing ? 'Pausar' : 'Reproducir'}>
            {playing ? (
              <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
                <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
              </svg>
            )}
          </button>
          <button type="button" onClick={toggleMute} className={ROUND_BTN} aria-label={muted ? 'Activar sonido' : 'Silenciar'}>
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5 6 9H3v6h3l5 4V5Z" fill="currentColor" />
              {muted ? (
                <path d="m16 9 5 6m0-6-5 6" />
              ) : (
                <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
              )}
            </svg>
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export default function About() {
  const paragraph = useRef(null)
  const { scrollYProgress } = useScroll({ target: paragraph, offset: ['start 0.85', 'end 0.55'] })
  const words = TEXT.split(' ')

  return (
    <section id="sobre-mi" className="relative mx-auto max-w-7xl px-4 py-24 sm:px-8 sm:py-32">
      <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,24rem)_1fr] lg:gap-20">
        <VideoCard />

        <div>
          <SectionHeading>Sobre mí</SectionHeading>

          <p ref={paragraph} className="mt-8 text-2xl leading-snug font-medium sm:text-3xl">
            {words.map((word, i) => (
              <Word key={i} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]}>
                {word}
              </Word>
            ))}
          </p>

          <div className="mt-10 flex gap-3">
            {SOCIALS.map(({ label, href, Icon }, i) => (
              <motion.a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className="grid size-14 place-items-center rounded-full border border-bone transition-colors hover:bg-bone hover:text-ink"
                initial={{ scale: 0, rotate: -90 }}
                whileInView={{ scale: 1, rotate: 0 }}
                whileHover={{ scale: 1.14, rotate: 8 }}
                whileTap={{ scale: 0.9 }}
                viewport={{ once: true }}
                transition={{ type: 'spring', stiffness: 260, damping: 15, delay: i * 0.08 }}
              >
                <Icon className="size-6" />
              </motion.a>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
