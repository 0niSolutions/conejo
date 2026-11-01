import { useEffect } from 'react'
import { motion } from 'motion/react'
import Logo from './Logo'

export default function Loader({ onDone }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 1400)
    return () => clearTimeout(timer)
  }, [onDone])

  return (
    <motion.div
      aria-hidden="true"
      className="fixed inset-0 z-50 grid place-items-center bg-ink"
      exit={{ scale: 8, opacity: 0 }}
      transition={{ duration: 0.9, ease: [0.55, 0, 0.45, 1] }}
    >
      <Logo animated className="size-36" />
    </motion.div>
  )
}
