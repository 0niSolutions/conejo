import { useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'motion/react'

// Aro que sigue al mouse y crece sobre lo clickeable. No reemplaza al cursor del sistema.
export default function Cursor() {
  const [enabled] = useState(() => window.matchMedia('(hover: hover) and (pointer: fine)').matches)
  const [hovering, setHovering] = useState(false)
  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  const springX = useSpring(x, { stiffness: 500, damping: 40 })
  const springY = useSpring(y, { stiffness: 500, damping: 40 })

  useEffect(() => {
    if (!enabled) return
    const onMove = (event) => {
      x.set(event.clientX)
      y.set(event.clientY)
      setHovering(Boolean(event.target.closest?.('a, button')))
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [enabled, x, y])

  if (!enabled) return null

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 z-50 -mt-4 -ml-4 size-8 rounded-full border border-bone mix-blend-difference"
      style={{ x: springX, y: springY }}
      animate={{ scale: hovering ? 1.9 : 1, backgroundColor: hovering ? 'rgba(244,241,234,1)' : 'rgba(244,241,234,0)' }}
      transition={{ duration: 0.2 }}
    />
  )
}
