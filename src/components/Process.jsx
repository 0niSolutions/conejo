import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import { STEPS } from '../data'

const DESKTOP_QUERY = '(min-width: 1024px)'

function useIsDesktop() {
  const [desktop, setDesktop] = useState(() => window.matchMedia(DESKTOP_QUERY).matches)
  useEffect(() => {
    const query = window.matchMedia(DESKTOP_QUERY)
    const onChange = (event) => setDesktop(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return desktop
}

function Step({ step, index }) {
  return (
    <motion.li
      className="w-full shrink-0 rounded-2xl border border-line bg-coal p-7 lg:w-[26rem] lg:p-9"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <span aria-hidden="true" className="text-outline font-brush text-7xl lg:text-8xl">
        {index + 1}
      </span>
      <h3 className="mt-4 text-2xl font-bold">{step.title}</h3>
      <p className="mt-2 text-ash">{step.text}</p>
    </motion.li>
  )
}

const HEADING = <h2 className="font-brush text-5xl sm:text-7xl">Cómo pedir el tuyo</h2>

function ProcessDesktop() {
  const section = useRef(null)
  const track = useRef(null)
  const [distance, setDistance] = useState(0)
  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] })
  const x = useTransform(scrollYProgress, [0, 1], [0, -distance])
  const seam = useTransform(scrollYProgress, (p) => `inset(0 ${100 - p * 100}% 0 0)`)

  useEffect(() => {
    const measure = () => setDistance(Math.max(0, track.current.scrollWidth - window.innerWidth))
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  return (
    <section ref={section} id="como-pedir" className="relative h-[280vh]">
      <div className="sticky top-0 flex h-svh flex-col justify-center overflow-hidden">
        <div className="mx-auto w-full max-w-7xl px-8">{HEADING}</div>
        <motion.ol ref={track} style={{ x }} className="mt-12 flex w-max gap-6 pr-[8vw] pl-[max(2rem,calc((100vw-80rem)/2+2rem))]">
          {STEPS.map((step, i) => (
            <Step key={step.title} step={step} index={i} />
          ))}
        </motion.ol>
        <motion.div aria-hidden="true" className="stitch-line mt-12 h-1 w-full text-sun-1" style={{ clipPath: seam }} />
      </div>
    </section>
  )
}

// En escritorio los pasos corren en horizontal con el scroll; en móvil van apilados.
export default function Process() {
  const desktop = useIsDesktop()
  if (desktop) return <ProcessDesktop />

  return (
    <section id="como-pedir" className="mx-auto max-w-7xl px-4 pb-24 sm:px-8">
      {HEADING}
      <ol className="mt-10 space-y-4">
        {STEPS.map((step, i) => (
          <Step key={step.title} step={step} index={i} />
        ))}
      </ol>
    </section>
  )
}
