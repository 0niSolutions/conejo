import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, useReducedMotion } from 'motion/react'
import About from './components/About'
import Cart from './components/Cart'
import Catalog from './components/Catalog'
import Cta from './components/Cta'
import Cursor from './components/Cursor'
import Featured from './components/Featured'
import Footer from './components/Footer'
import Hero from './components/Hero'
import Loader from './components/Loader'
import Marquee from './components/Marquee'
import Nav from './components/Nav'
import Products from './components/Products'
import { ProductModalProvider } from './components/ProductModal'
import { CartProvider } from './cart'
import catalog from './catalog.json'
import { parsePath, routeMeta } from './seo'

function parseRoute() {
  const { hash, pathname, search } = window.location
  // El panel ahora es una página aparte (/admin/). Los links viejos a #/admin llevan ahí.
  if (/^#\/admin\b/.test(hash)) window.location.replace('/admin/')
  // Links viejos con hash (#/productos/rinoneras): pasan a la dirección real sin recargar.
  const old = hash.match(/^#(\/productos(?:\/[\w-]+)?)/)
  if (old) window.history.replaceState(null, '', `${old[1]}${search}`)
  return parsePath(old ? old[1] : pathname)
}

// Un link a una página de esta web (no al panel ni a otra pestaña) que conviene abrir sin recargar.
function internalLink(event) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null
  const link = event.target.closest?.('a[href]')
  if (!link || (link.target && link.target !== '_self') || link.hasAttribute('download') || link.origin !== window.location.origin) return null
  if (/^\/(admin|api)\b/.test(link.pathname)) return null
  // Un ancla de la misma página (#sobre-mi estando en el inicio): la maneja el navegador.
  if (link.pathname === window.location.pathname && link.hash) return null
  return link
}

// Páginas con direcciones reales: /productos y /productos/rinoneras. Los hash comunes (#sobre-mi)
// siguen siendo anclas del inicio. Cada página también existe como HTML propio (scripts/prerender.mjs).
function useRoute() {
  const [route, setRoute] = useState(parseRoute)
  const homeScroll = useRef(0)
  const previousPage = useRef(route.page)

  useEffect(() => {
    const update = () => {
      if (previousPage.current === 'inicio') homeScroll.current = window.scrollY
      setRoute(parseRoute())
    }
    const onClick = (event) => {
      const link = internalLink(event)
      if (!link) return
      event.preventDefault()
      if (link.href !== window.location.href) window.history.pushState(null, '', link.href)
      update()
    }
    window.addEventListener('popstate', update)
    window.addEventListener('hashchange', update)
    document.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('popstate', update)
      window.removeEventListener('hashchange', update)
      document.removeEventListener('click', onClick)
    }
  }, [])

  useLayoutEffect(() => {
    if (previousPage.current === route.page) return
    previousPage.current = route.page
    const anchor = route.page === 'inicio' && window.location.hash && document.getElementById(window.location.hash.slice(1))
    if (anchor) anchor.scrollIntoView({ behavior: 'instant' })
    else window.scrollTo({ top: route.page === 'inicio' ? homeScroll.current : 0, behavior: 'instant' })
  }, [route.page])

  // Título, descripción y dirección canónica de la página actual (el HTML inicial ya los trae).
  useEffect(() => {
    const meta = routeMeta(catalog, route)
    document.title = meta.title
    document.querySelector('meta[name="description"]')?.setAttribute('content', meta.description)
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', meta.url)
  }, [route])

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
        <ProductModalProvider>
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
              <Featured />
              <Products />
              <Cta />
            </main>
          )}
          <Footer />
        </ProductModalProvider>
      </CartProvider>
    </MotionConfig>
  )
}
