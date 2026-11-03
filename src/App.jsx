import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, useReducedMotion } from 'motion/react'
import About from './components/About'
import Cart from './components/Cart'
import Catalog from './components/Catalog'
import Cta from './components/Cta'
import Cursor from './components/Cursor'
import Footer from './components/Footer'
import Hero from './components/Hero'
import Loader from './components/Loader'
import Marquee from './components/Marquee'
import Nav from './components/Nav'
import Products from './components/Products'
import { CartProvider } from './cart'

function parseRoute() {
  const match = window.location.hash.match(/^#\/productos(?:\/([\w-]+))?/)
  return match ? { page: 'productos', tag: match[1] } : { page: 'inicio' }
}

// Páginas por hash: `#/productos/rinoneras`. Los hash comunes (`#sobre-mi`) siguen siendo anclas del inicio.
function useRoute() {
  const [route, setRoute] = useState(parseRoute)
  const homeScroll = useRef(0)
  const previousPage = useRef(route.page)

  useEffect(() => {
    const onHashChange = () => {
      if (previousPage.current === 'inicio') homeScroll.current = window.scrollY
      setRoute(parseRoute())
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useLayoutEffect(() => {
    if (previousPage.current === route.page) return
    previousPage.current = route.page
    const anchor = route.page === 'inicio' && document.getElementById(window.location.hash.slice(1))
    if (anchor) anchor.scrollIntoView({ behavior: 'instant' })
    else window.scrollTo({ top: route.page === 'inicio' ? homeScroll.current : 0, behavior: 'instant' })
  }, [route.page])

  return route
}

export default function App() {
  const reducedMotion = useReducedMotion()
  const [ready, setReady] = useState(Boolean(reducedMotion))
  const finishLoading = useCallback(() => setReady(true), [])
  const route = useRoute()

  return (
    <MotionConfig reducedMotion="user">
      <CartProvider>
        <AnimatePresence>{!ready && <Loader onDone={finishLoading} />}</AnimatePresence>
        <Cursor />
        <div aria-hidden="true" className="grain pointer-events-none fixed inset-0 z-30 opacity-[0.06]" />
        <Nav ready={ready} page={route.page} />
        <Cart />
        {route.page === 'productos' ? (
          <main>
            <Catalog tag={route.tag} />
          </main>
        ) : (
          <main>
            <Hero play={ready} />
            <Marquee />
            <About />
            <Products />
            <Cta />
          </main>
        )}
        <Footer />
      </CartProvider>
    </MotionConfig>
  )
}
