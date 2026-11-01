import { motion, useScroll, useSpring, useTransform, useVelocity } from 'motion/react'
import { PRODUCTS } from '../data'

function Row({ reverse, time, outlined }) {
  return (
    <div className={`marquee flex w-max ${reverse ? 'marquee-reverse' : ''}`} style={{ '--marquee-time': time }}>
      {[0, 1].map((copy) => (
        <div key={copy} aria-hidden="true" className="flex shrink-0 items-center">
          {PRODUCTS.map(({ name }) => (
            <span
              key={name}
              className={`flex items-center gap-8 pr-8 font-brush text-4xl whitespace-nowrap sm:text-6xl ${outlined ? 'text-outline' : ''}`}
            >
              {name}
              <span className="text-2xl text-sun-2 [-webkit-text-stroke:0]">✦</span>
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}

// Se inclina según la velocidad del scroll.
export default function Marquee() {
  const { scrollY } = useScroll()
  const velocity = useSpring(useVelocity(scrollY), { stiffness: 80, damping: 30 })
  const skewY = useTransform(velocity, [-2500, 2500], [-3, 3])

  return (
    <motion.div style={{ skewY }} className="relative z-10 space-y-3 overflow-hidden border-y border-line bg-ink py-6">
      <Row time="42s" />
      <Row time="55s" reverse outlined />
    </motion.div>
  )
}
