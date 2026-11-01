import { InstagramIcon, WhatsAppIcon } from './ui'
import { INSTAGRAM_URL, WHATSAPP_URL } from '../data'

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-line bg-ink">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-ash sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>
          <span className="font-semibold text-bone">Conejo.08</span> · Marroquinería personalizada · Salta Capital, Argentina
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
    </footer>
  )
}
