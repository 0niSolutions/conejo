import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import Logo from './Logo'
import { InstagramIcon, MagneticLink, WhatsAppIcon } from './ui'
import { INSTAGRAM_URL, WHATSAPP_URL } from '../data'

const WORDS = ['¿Buscás', 'el', 'tuyo?']

export default function Cta() {
  const section = useRef(null)
  const { scrollYProgress } = useScroll({ target: section, offset: ['start end', 'end end'] })
  const sunY = useTransform(scrollYProgress, [0, 1], [240, 0])
  const sunRotate = useTransform(scrollYProgress, [0, 1], [-24, 0])

  return (
    <section ref={section} id="redes" className="relative overflow-hidden pt-16 text-center sm:pt-24">
      <h2 aria-label="¿Buscás el tuyo?" className="px-4 font-brush text-6xl leading-tight sm:text-8xl lg:text-9xl">
        {WORDS.map((word, i) => (
          <motion.span
            key={word}
            aria-hidden="true"
            className="inline-block pr-[0.25em]"
            initial={{ opacity: 0, y: 60, rotate: 8 }}
            whileInView={{ opacity: 1, y: 0, rotate: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
          >
            {word}
          </motion.span>
        ))}
      </h2>

      <motion.p
        className="mt-6 px-4 text-lg text-ash sm:text-xl"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5, duration: 0.8 }}
      >
        Escribime. Atención todos los días, 24/7.
      </motion.p>

      <motion.div
        className="relative z-10 mt-9 flex flex-wrap justify-center gap-4 px-4"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.65, duration: 0.6 }}
      >
        <MagneticLink
          href={WHATSAPP_URL}
          target="_blank"
          rel="noreferrer"
          className="wa-pulse relative inline-flex items-center gap-3 rounded-full bg-bone px-7 py-4 font-semibold text-ink"
        >
          <WhatsAppIcon className="size-6" /> Escribime por WhatsApp
        </MagneticLink>
        <MagneticLink
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-3 rounded-full border border-bone bg-ink px-7 py-4 font-medium transition-colors hover:bg-bone hover:text-ink"
        >
          <InstagramIcon className="size-6" /> @conejo.08
        </MagneticLink>
      </motion.div>

      <motion.div style={{ y: sunY, rotate: sunRotate }} className="mx-auto mt-12 -mb-[30vw] w-[min(92vw,44rem)] sm:-mb-64">
        <Logo animated whenInView className="w-full" />
      </motion.div>
    </section>
  )
}
