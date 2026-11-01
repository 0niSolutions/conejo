import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from 'motion/react'
import { Menu, X } from 'lucide-react'
import Logo from './Logo'
import { InstagramIcon, MagneticLink } from './ui'
import { INSTAGRAM_URL, NAV_LINKS } from '../data'

export default function Nav({ ready }) {
  const { scrollY, scrollYProgress } = useScroll()
  const [compact, setCompact] = useState(false)
  const [active, setActive] = useState('inicio')
  const [open, setOpen] = useState(false)
  const stitchClip = useTransform(scrollYProgress, (p) => `inset(0 ${100 - p * 100}% 0 0)`)

  useMotionValueEvent(scrollY, 'change', (y) => setCompact(y > 40))

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id)
        })
      },
      { rootMargin: '-45% 0px -50% 0px' },
    )
    NAV_LINKS.forEach(({ id }) => {
      const section = document.getElementById(id)
      if (section) observer.observe(section)
    })
    return () => observer.disconnect()
  }, [])

  return (
    <motion.header
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${compact || open ? 'bg-ink/85 backdrop-blur-md' : ''}`}
      initial={{ y: -110 }}
      animate={{ y: ready ? 0 : -110 }}
      transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className={`mx-auto flex max-w-7xl items-center justify-between px-4 transition-all duration-300 sm:px-8 ${compact ? 'py-2' : 'py-3 sm:py-5'}`}>
        <a href="#inicio" className="flex items-center gap-3">
          <motion.span whileHover={{ rotate: 360 }} transition={{ duration: 0.9, ease: 'easeInOut' }} className="block">
            <Logo className={`transition-all duration-300 ${compact ? 'size-11' : 'size-14 sm:size-16'}`} />
          </motion.span>
          <span className="text-xl font-bold tracking-tight sm:text-2xl">Conejo.08</span>
        </a>

        <nav aria-label="Principal" className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map(({ id, label }) => (
            <a
              key={id}
              href={`#${id}`}
              className={`relative px-3.5 py-2 text-sm transition-colors ${active === id ? 'font-semibold text-bone' : 'text-ash hover:text-bone'}`}
            >
              {label}
              {active === id && <motion.span layoutId="nav-underline" className="absolute inset-x-2 bottom-0 h-0.5 bg-bone" />}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <MagneticLink
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-2.5 rounded-full border border-bone px-5 py-2.5 text-sm font-medium transition-colors hover:bg-bone hover:text-ink sm:inline-flex"
          >
            <InstagramIcon className="size-5" /> Seguime
          </MagneticLink>
          <button
            type="button"
            className="grid size-11 place-items-center lg:hidden"
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            aria-label="Móvil"
            className="overflow-hidden lg:hidden"
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex flex-col px-4 pb-6">
              {NAV_LINKS.map(({ id, label }, i) => (
                <motion.a
                  key={id}
                  href={`#${id}`}
                  onClick={() => setOpen(false)}
                  className="py-3 font-brush text-3xl"
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + i * 0.05 }}
                >
                  {label}
                </motion.a>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      <motion.div aria-hidden="true" className="stitch-line h-0.5 text-sun-1" style={{ clipPath: stitchClip }} />
    </motion.header>
  )
}
