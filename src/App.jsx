import { useCallback, useState } from 'react'
import { AnimatePresence, MotionConfig, useReducedMotion } from 'motion/react'
import About from './components/About'
import Cta from './components/Cta'
import Cursor from './components/Cursor'
import Footer from './components/Footer'
import Hero from './components/Hero'
import Loader from './components/Loader'
import Marquee from './components/Marquee'
import Nav from './components/Nav'
import Process from './components/Process'
import Products from './components/Products'

export default function App() {
  const reducedMotion = useReducedMotion()
  const [ready, setReady] = useState(Boolean(reducedMotion))
  const finishLoading = useCallback(() => setReady(true), [])

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>{!ready && <Loader onDone={finishLoading} />}</AnimatePresence>
      <Cursor />
      <div aria-hidden="true" className="grain pointer-events-none fixed inset-0 z-30 opacity-[0.06]" />
      <Nav ready={ready} />
      <main>
        <Hero play={ready} />
        <Marquee />
        <About />
        <Products />
        <Process />
        <Cta />
      </main>
      <Footer />
    </MotionConfig>
  )
}
