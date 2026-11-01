import { useId, useRef } from 'react'
import { motion, useInView } from 'motion/react'
import logoUrl from '../assets/logo.webp'
import headUrl from '../assets/logo-head.webp'

// Límites de cada franja del logo, en unidades del viewBox.
const BAND_EDGES = [0, 18, 45.2, 71.9, 98.7, 125.4, 152.3, 179, 200]

// `animated` despliega las franjas una por una; con `whenInView` espera a entrar en pantalla.
export default function Logo({ mono = false, animated = false, whenInView = false, ...props }) {
  const id = useId()
  const svg = useRef(null)
  const inView = useInView(svg, { once: true, amount: 0.2 })
  const revealed = !whenInView || inView

  return (
    <svg ref={svg} viewBox="0 0 200 200" role="img" aria-label="Logo de Conejo.08" {...props}>
      <defs>
        <clipPath id={`${id}-circle`}>
          <circle cx="100" cy="100" r="100" />
        </clipPath>
        {mono && (
          <filter id={`${id}-mono`}>
            <feColorMatrix type="saturate" values="0" />
          </filter>
        )}
      </defs>
      <g filter={mono ? `url(#${id}-mono)` : undefined}>
        <image href={logoUrl} width="200" height="200" />
        {animated && (
          <>
            {/* Tapas que se retiran para revelar las franjas; la cabeza queda siempre visible encima. */}
            <g clipPath={`url(#${id}-circle)`}>
              {BAND_EDGES.slice(0, -1).map((y, i) => (
                <motion.rect
                  key={y}
                  x="-1"
                  y={y - 0.5}
                  width="202"
                  height={BAND_EDGES[i + 1] - y + 1}
                  fill="#000"
                  style={{ originX: i % 2 ? 0 : 1, transformBox: 'fill-box' }}
                  initial={{ scaleX: 1 }}
                  animate={{ scaleX: revealed ? 0 : 1 }}
                  transition={{ duration: 0.7, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                />
              ))}
            </g>
            <image href={headUrl} width="200" height="200" />
          </>
        )}
      </g>
    </svg>
  )
}
