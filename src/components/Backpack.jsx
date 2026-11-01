import { motion } from 'motion/react'
import Logo from './Logo'
import { Stitch } from './ui'

// Mochila ilustrada con el logo de parche: ocupa el lugar del buzo del mockup.
export default function Backpack({ play }) {
  return (
    <svg viewBox="0 0 500 600" className="size-full overflow-visible" role="img" aria-label="Mochila personalizada con el logo de Conejo.08">
      <defs>
        <linearGradient id="bp-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3f3f3f" />
          <stop offset="0.5" stopColor="#222" />
          <stop offset="1" stopColor="#0e0e0e" />
        </linearGradient>
        <linearGradient id="bp-panel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#383838" />
          <stop offset="1" stopColor="#161616" />
        </linearGradient>
      </defs>

      <path d="M196 90Q196 26 250 26Q304 26 304 90" fill="none" stroke="#2c2c2c" strokeWidth="20" strokeLinecap="round" />
      <path d="M196 90Q196 26 250 26Q304 26 304 90" fill="none" stroke="#000" strokeWidth="1.5" strokeDasharray="6 6" />
      <path d="M112 172Q112 92 250 92Q388 92 388 172L412 522Q414 566 370 566H130Q86 566 88 522Z" fill="url(#bp-body)" stroke="#4a4a4a" strokeWidth="2" />
      <path d="M112 176Q250 278 388 176Q386 96 250 96Q114 96 112 176Z" fill="url(#bp-panel)" stroke="#000" strokeWidth="2" />
      <path d="M132 318H368Q382 318 382 332V520Q382 536 366 536H134Q118 536 118 520V332Q118 318 132 318Z" fill="url(#bp-panel)" stroke="#000" strokeWidth="2" />

      {[180, 320].map((x) => (
        <g key={x}>
          <rect x={x - 13} y="196" width="26" height="110" rx="4" fill="#0f0f0f" stroke="#3d3d3d" />
          <rect x={x - 19} y="270" width="38" height="24" rx="4" fill="none" stroke="#b9b9b9" strokeWidth="4" />
          <rect x={x - 2} y="272" width="4" height="20" fill="#b9b9b9" />
        </g>
      ))}

      <g className="text-bone">
        <Stitch d="M122 172Q124 112 250 110Q376 112 378 172" size={600} play={play} delay={0.5} duration={1.3} dash="11 9" />
        <Stitch d="M104 300 100 520Q100 552 130 552H370Q400 552 400 520L396 300" size={600} play={play} delay={0.9} duration={2} dash="11 9" />
        <Stitch d="M132 332H368V522H132Z" size={600} play={play} delay={1.5} duration={1.6} dash="11 9" />
      </g>

      <motion.g
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        initial={{ scale: 0, rotate: -120 }}
        animate={play ? { scale: 1, rotate: 0 } : {}}
        transition={{ type: 'spring', stiffness: 120, damping: 13, delay: 1.2 }}
      >
        <Logo mono x="164" y="340" width="172" height="172" />
      </motion.g>
    </svg>
  )
}
