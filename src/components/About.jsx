import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import { CountUp, InstagramIcon, SectionHeading, WhatsAppIcon } from './ui'
import { INSTAGRAM_URL, STATS, WHATSAPP_URL } from '../data'

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

export default function About() {
  const paragraph = useRef(null)
  const { scrollYProgress } = useScroll({ target: paragraph, offset: ['start 0.85', 'end 0.55'] })
  const words = TEXT.split(' ')

  return (
    <section id="sobre-mi" className="relative mx-auto max-w-7xl px-4 py-24 sm:px-8 sm:py-32">
      <SectionHeading>Sobre mí</SectionHeading>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_auto] lg:items-end">
        <p ref={paragraph} className="max-w-3xl text-2xl leading-snug font-medium sm:text-4xl">
          {words.map((word, i) => (
            <Word key={i} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]}>
              {word}
            </Word>
          ))}
        </p>

        <div className="flex gap-3">
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

      <dl className="mt-16 grid gap-px overflow-hidden rounded-2xl bg-line sm:grid-cols-3">
        {STATS.map((stat, i) => (
          <motion.div
            key={stat.label}
            className="bg-ink p-6 sm:p-8"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.6, delay: i * 0.12 }}
          >
            <dt className="text-sm text-ash">{stat.label}</dt>
            <dd className="mt-2 font-brush text-5xl sm:text-6xl">
              <CountUp to={stat.value} suffix={stat.suffix} />
            </dd>
          </motion.div>
        ))}
      </dl>
    </section>
  )
}
