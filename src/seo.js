// Títulos, descripciones y direcciones de cada página. Lo usan la web (al cambiar de página) y
// scripts/prerender.mjs (que arma el HTML que leen Google y las IA). No importa nada a propósito:
// recibe el catálogo, así funciona igual en el navegador y en Node.

export const SITE_URL = 'https://conejo08.com.ar'
export const SITE_NAME = 'CONEJO.08'

// "/productos/rinoneras" -> { page: 'productos', tag: 'rinoneras' }
export function parsePath(pathname) {
  const match = pathname.match(/^\/productos(?:\/([\w-]+))?\/?$/)
  return match ? { page: 'productos', tag: match[1] } : { page: 'inicio' }
}

export const pathFor = (route) => (route.page !== 'productos' ? '/' : route.tag ? `/productos/${route.tag}` : '/productos')

const visibleProducts = (catalog) => catalog.products.filter((product) => !product.hidden)

export function routeMeta(catalog, route) {
  const products = visibleProducts(catalog)
  const line = route.page === 'productos' && catalog.lines.find(({ slug }) => slug === route.tag)
  const url = `${SITE_URL}${pathFor(line ? route : { page: route.page })}`

  if (line) {
    const count = products.filter((product) => product.line === line.slug).length
    return {
      url,
      title: `${line.name} artesanales | ${SITE_NAME}, Salta`,
      description: `${line.text} ${count} ${count === 1 ? 'modelo hecho' : 'modelos hechos'} a mano en Salta Capital. Mirá los precios y pedí el tuyo por WhatsApp.`,
    }
  }
  if (route.page === 'productos') {
    return {
      url,
      title: `Productos | ${SITE_NAME}, marroquinería artesanal en Salta`,
      description: `${products.length} productos hechos a mano en Salta Capital: ${catalog.lines
        .slice(0, 5)
        .map(({ name }) => name.toLowerCase())
        .join(', ')} y más. Precios y pedidos por WhatsApp.`,
    }
  }
  return {
    url,
    title: `${SITE_NAME} | Marroquinería artesanal en Salta`,
    description:
      'Riñoneras, mochilas, bolsos, fundas de guitarra y materos hechos a mano en Salta Capital. Mirá los modelos y precios, y pedí el tuyo por WhatsApp.',
  }
}
