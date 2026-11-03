import { motion } from 'motion/react'
import { InstagramIcon, MagneticLink, WhatsAppIcon } from './ui'
import { INSTAGRAM_URL, ONI_URL, WHATSAPP_URL } from '../data'

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-line bg-ink">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-ash sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>
          <span className="font-semibold text-bone">Conejo</span> · Marroquinería artesanal · Salta Capital, Argentina
        </p>
        <div className="flex gap-5">
          <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 transition-colors hover:text-bone">
            <InstagramIcon className="size-4" /> Instagram
          </a>
          <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 transition-colors hover:text-bone">
            <WhatsAppIcon className="size-4" /> WhatsApp
          </a>
        </div>
      </div>

      <motion.div
        className="flex justify-center pb-8"
        initial={{ opacity: 0, y: 24, rotate: -4 }}
        whileInView={{ opacity: 1, y: 0, rotate: 0 }}
        viewport={{ once: true }}
        transition={{ type: 'spring', stiffness: 220, damping: 13 }}
      >
        <MagneticLink
          href={ONI_URL}
          target="_blank"
          rel="noreferrer"
          strength={0.4}
          className="group relative inline-flex items-baseline gap-2 px-2 pb-2 text-sm text-ash transition-colors hover:text-bone"
        >
          Powered by
          <span className="oni-shine inline-block pr-1 font-brush text-3xl leading-none transition-transform duration-300 group-hover:scale-125 group-hover:-rotate-6">Oni</span>
          <span aria-hidden="true" className="stitch-line absolute inset-x-2 bottom-0 h-0.5 origin-left scale-x-0 text-sun-1 transition-transform duration-500 group-hover:scale-x-100" />
        </MagneticLink>
      </motion.div>
    </footer>
  )
}
