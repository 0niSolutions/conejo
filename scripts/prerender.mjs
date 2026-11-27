// Corre después de `vite build` (ver "build" en package.json).
//
// La web se arma en el navegador con React, así que el HTML que publica Vite llega vacío. Google
// ejecuta JavaScript (tarde y no siempre), pero los robots de ChatGPT, Claude y Perplexity no: para
// ellos la web estaba en blanco. Este script escribe una página HTML por dirección con el contenido
// real del catálogo (textos, productos, precios), datos estructurados (schema.org) y las etiquetas
// para compartir. Al cargar, React reemplaza ese contenido por la web animada de siempre.
//
// También genera sitemap.xml, llms.txt y 404.html.

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { SITE_NAME, SITE_URL, pathFor, routeMeta } from '../src/seo.js'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')

const catalog = JSON.parse(await readFile(path.join(ROOT, 'src/catalog.json'), 'utf8'))
const template = await readFile(path.join(DIST, 'index.html'), 'utf8')

// Datos de contacto (los mismos de src/data.js).
const INSTAGRAM_URL = 'https://www.instagram.com/conejo.08/'
const WHATSAPP_URL = 'https://wa.me/5493875269754'
const PHONE = '+5493875269754'
const OG_IMAGE = { url: `${SITE_URL}/og-image.jpg`, width: 1200, height: 630 }
const DEFAULT_BIO =
  'Hago marroquinería artesanal desde Salta Capital. Riñoneras, mochilas, bolsos, fundas de guitarra, materos y más: cada pieza está hecha a mano, una por una. Si buscás el tuyo, escribime, atiendo todos los días.'

const products = catalog.products.filter((product) => !product.hidden)
const lineBySlug = Object.fromEntries(catalog.lines.map((line) => [line.slug, line]))
const linesWithProducts = catalog.lines.filter((line) => products.some((product) => product.line === line.slug))
const bio = catalog.site?.bio || DEFAULT_BIO

const esc = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const price = (value) => value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
const absolute = (url) => (url.startsWith('http') ? url : `${SITE_URL}${url}`)
// JSON dentro de <script>: "</" partido para que ningún texto del catálogo pueda cerrar la etiqueta.
const jsonLd = (data) => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`

const STORE_ID = `${SITE_URL}/#negocio`
const store = {
  '@type': 'Store',
  '@id': STORE_ID,
  name: SITE_NAME,
  description: 'Marroquinería artesanal hecha a mano en Salta Capital: riñoneras, mochilas, bolsos, fundas de guitarra, materos y más.',
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/logo.png`,
  image: OG_IMAGE.url,
  telephone: PHONE,
  address: { '@type': 'PostalAddress', addressLocality: 'Salta', addressRegion: 'Salta', addressCountry: 'AR' },
  areaServed: { '@type': 'Country', name: 'Argentina' },
  currenciesAccepted: 'ARS',
  sameAs: [INSTAGRAM_URL],
}

function productLd(product, pageUrl) {
  const line = lineBySlug[product.line]
  return {
    '@type': 'Product',
    '@id': `${pageUrl}#${product.id}`,
    name: product.name,
    description: product.text || `${line.name} hecha a mano en Salta.`,
    category: line.name,
    brand: { '@type': 'Brand', name: SITE_NAME },
    ...(product.photos.length ? { image: product.photos.map(absolute) } : {}),
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'ARS',
      availability: product.soldOut ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      url: pageUrl,
      seller: { '@id': STORE_ID },
    },
  }
}

function breadcrumbs(items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: url })),
  }
}

// ---------- Contenido de cada página (HTML simple y semántico, sin animaciones)

const NAV = `<header class="mx-auto max-w-7xl px-4 py-6 sm:px-8">
  <a href="/" class="text-xl font-bold">${SITE_NAME}</a>
  <nav aria-label="Principal" class="mt-3 flex flex-wrap gap-4 text-sm text-ash">
    <a href="/">Inicio</a> <a href="/#sobre-mi">Sobre mí</a> <a href="/productos">Productos</a> <a href="/#redes">Redes</a>
  </nav>
</header>`

const FOOTER = `<footer id="redes" class="mx-auto max-w-7xl px-4 py-10 text-sm text-ash sm:px-8">
  <p>${SITE_NAME} · Marroquinería artesanal · Salta Capital, Argentina.</p>
  <p class="mt-2">Pedidos por <a href="${WHATSAPP_URL}">WhatsApp</a> · <a href="${INSTAGRAM_URL}">Instagram @conejo.08</a></p>
</footer>`

function productItem(product) {
  const line = lineBySlug[product.line]
  const photo = product.photos[0]
  return `<li class="py-3">
      ${photo ? `<img src="${esc(photo)}" alt="${esc(product.name)}" width="160" height="160" loading="lazy" />` : ''}
      <h3 class="font-bold">${esc(product.name)}</h3>
      <p class="text-sm text-ash">${esc(line.name)}${product.text ? ` · ${esc(product.text)}` : ''}</p>
      <p>${price(product.price)}${product.soldOut ? ' · Sin stock por ahora' : ''}</p>
    </li>`
}

function homeContent() {
  const byId = Object.fromEntries(products.map((product) => [product.id, product]))
  const featured = (catalog.featured ?? []).filter((item) => typeof item === 'object' && byId[item.product])
  return `<h1 class="text-4xl font-bold">${SITE_NAME}, marroquinería artesanal en Salta</h1>
  <p class="mt-4 text-lg">Artesanal · Hecho a mano · Salteño. <a href="${WHATSAPP_URL}">Pedí el tuyo por WhatsApp</a>.</p>

  <section id="sobre-mi" class="mt-12">
    <h2 class="text-2xl font-bold">Sobre mí</h2>
    <p class="mt-3">${esc(bio)}</p>
  </section>
${
  featured.length
    ? `
  <section id="destacados" class="mt-12">
    <h2 class="text-2xl font-bold">Lo último</h2>
    <ul>${featured
      .map(({ photo, product }) => {
        const item = byId[product]
        return `<li><a href="/productos/${item.line}"><img src="${esc(photo)}" alt="${esc(item.name)}" width="300" height="300" loading="lazy" /> ${esc(item.name)}</a></li>`
      })
      .join('')}</ul>
  </section>`
    : ''
}
  <section id="productos" class="mt-12">
    <h2 class="text-2xl font-bold">Lo que hago</h2>
    <ul>${linesWithProducts
      .map((line) => {
        const count = products.filter((product) => product.line === line.slug).length
        return `
      <li class="py-2"><a href="/productos/${line.slug}"><strong>${esc(line.name)}</strong></a>: ${esc(line.text)} (${count} ${count === 1 ? 'modelo' : 'modelos'})</li>`
      })
      .join('')}
    </ul>
    <p class="mt-4"><a href="/productos">Ver todos los productos y precios</a></p>
  </section>

  <section class="mt-12">
    <h2 class="text-2xl font-bold">¿Buscás el tuyo?</h2>
    <p class="mt-3">Escribime por <a href="${WHATSAPP_URL}">WhatsApp</a> o por <a href="${INSTAGRAM_URL}">Instagram</a>. Atiendo todos los días.</p>
  </section>`
}

function catalogContent(line) {
  const items = line ? products.filter((product) => product.line === line.slug) : products
  return `<p class="text-sm text-ash"><a href="/">Inicio</a> › <a href="/productos">Productos</a>${line ? ` › ${esc(line.name)}` : ''}</p>
  <h1 class="mt-3 text-4xl font-bold">${line ? `${esc(line.name)} artesanales` : 'Productos'}</h1>
  <p class="mt-3">${line ? `${esc(line.text)} ` : ''}${items.length} ${items.length === 1 ? 'producto hecho' : 'productos hechos'} a mano en Salta Capital. Agregá lo que quieras al carrito y enviá el pedido por WhatsApp.</p>
  <nav aria-label="Líneas de productos" class="mt-6 flex flex-wrap gap-3 text-sm">
    <a href="/productos">Todos</a>${linesWithProducts.map(({ slug, name }) => ` <a href="/productos/${slug}">${esc(name)}</a>`).join('')}
  </nav>
  <ul class="mt-8">
    ${items.map(productItem).join('\n    ')}
  </ul>`
}

// ---------- Armado de cada archivo

function page({ route, content, structured, noindex = false }) {
  const meta = routeMeta(catalog, route)
  const head = [
    `<title>${esc(meta.title)}</title>`,
    `<meta name="description" content="${esc(meta.description)}" />`,
    noindex ? '<meta name="robots" content="noindex" />' : `<link rel="canonical" href="${meta.url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:locale" content="es_AR" />`,
    `<meta property="og:title" content="${esc(meta.title)}" />`,
    `<meta property="og:description" content="${esc(meta.description)}" />`,
    `<meta property="og:url" content="${meta.url}" />`,
    `<meta property="og:image" content="${OG_IMAGE.url}" />`,
    `<meta property="og:image:width" content="${OG_IMAGE.width}" />`,
    `<meta property="og:image:height" content="${OG_IMAGE.height}" />`,
    `<meta property="og:image:alt" content="${SITE_NAME}, marroquinería artesanal en Salta" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    structured ? jsonLd({ '@context': 'https://schema.org', '@graph': structured }) : '',
  ]
    .filter(Boolean)
    .join('\n    ')

  const html = template
    .replace(/<!-- seo:start[\s\S]*?<!-- seo:end -->/, head)
    .replace('<div id="root"></div>', `<div id="root">\n${NAV}\n<main class="mx-auto max-w-7xl px-4 pb-16 sm:px-8">\n  ${content}\n</main>\n${FOOTER}\n</div>`)
  if (html === template || !html.includes('<div id="root">\n')) throw new Error('No se encontraron las marcas de index.html (seo:start / root).')
  return html
}

const write = async (file, text) => {
  await mkdir(path.dirname(path.join(DIST, file)), { recursive: true })
  await writeFile(path.join(DIST, file), text)
}

const home = { page: 'inicio' }
await write(
  'index.html',
  page({
    route: home,
    content: homeContent(),
    structured: [{ '@type': 'WebSite', '@id': `${SITE_URL}/#web`, name: SITE_NAME, url: `${SITE_URL}/`, inLanguage: 'es-AR', publisher: { '@id': STORE_ID } }, store],
  }),
)

// /productos -> productos.html y /productos/rinoneras -> productos/rinoneras.html: Cloudflare sirve
// esos archivos en esas direcciones exactas, sin barra al final.
const catalogPages = [{ page: 'productos' }, ...catalog.lines.map(({ slug }) => ({ page: 'productos', tag: slug }))]
for (const route of catalogPages) {
  const line = route.tag && lineBySlug[route.tag]
  const url = routeMeta(catalog, route).url
  const items = line ? products.filter((product) => product.line === line.slug) : products
  await write(
    `${pathFor(route).slice(1)}.html`,
    page({
      route,
      content: catalogContent(line),
      structured: [
        store,
        breadcrumbs([['Inicio', `${SITE_URL}/`], ['Productos', `${SITE_URL}/productos`], ...(line ? [[line.name, url]] : [])]),
        {
          '@type': 'CollectionPage',
          '@id': `${url}#pagina`,
          url,
          name: line ? `${line.name} artesanales` : 'Productos',
          isPartOf: { '@id': `${SITE_URL}/#web` },
          mainEntity: { '@type': 'ItemList', numberOfItems: items.length, itemListElement: items.map((product, i) => ({ '@type': 'ListItem', position: i + 1, item: productLd(product, url) })) },
        },
      ],
    }),
  )
}

// Una dirección que no existe: avisa y no se indexa. Cloudflare la sirve con código 404.
await write(
  '404.html',
  page({
    route: home,
    noindex: true,
    content: `<h1 class="text-4xl font-bold">No encontramos esta página</h1>\n  <p class="mt-3"><a href="/">Volver al inicio</a> o <a href="/productos">ver los productos</a>.</p>`,
  }).replace(/<title>[^<]*<\/title>/, `<title>Página no encontrada | ${SITE_NAME}</title>`),
)

// ---------- sitemap.xml
const today = new Date().toISOString().slice(0, 10)
const urls = [home, { page: 'productos' }, ...linesWithProducts.map(({ slug }) => ({ page: 'productos', tag: slug }))].map((route) => routeMeta(catalog, route).url)
await write(
  'sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((url) => `  <url><loc>${url}</loc><lastmod>${today}</lastmod></url>`)
    .join('\n')}\n</urlset>\n`,
)

// ---------- llms.txt (https://llmstxt.org): resumen en texto para asistentes de IA
const range = (items) => {
  const prices = items.map((product) => product.price)
  const [min, max] = [Math.min(...prices), Math.max(...prices)]
  return min === max ? price(min) : `de ${price(min)} a ${price(max)}`
}
await write(
  'llms.txt',
  `# ${SITE_NAME}

> Marroquinería artesanal hecha a mano en Salta Capital, Argentina. Riñoneras, mochilas, bolsos, fundas de guitarra, materos y más. Los pedidos se hacen por WhatsApp.

${bio}

## Cómo comprar

- Elegí los productos en ${SITE_URL}/productos, agregalos al carrito y enviá el pedido por WhatsApp.
- WhatsApp: ${WHATSAPP_URL} (${PHONE})
- Instagram: ${INSTAGRAM_URL}
- Ubicación: Salta Capital, Salta, Argentina.
- Precios en pesos argentinos (ARS). Última actualización: ${today}.

## Líneas de productos

${linesWithProducts
  .map((line) => {
    const items = products.filter((product) => product.line === line.slug)
    return `- [${line.name}](${SITE_URL}/productos/${line.slug}): ${line.text} ${items.length} ${items.length === 1 ? 'modelo' : 'modelos'}, ${range(items)}.`
  })
  .join('\n')}

## Productos

${linesWithProducts
  .map(
    (line) =>
      `### ${line.name}\n\n${products
        .filter((product) => product.line === line.slug)
        .map((product) => `- ${product.name}: ${price(product.price)}${product.soldOut ? ' (sin stock por ahora)' : ''}${product.text ? `. ${product.text}` : ''}`)
        .join('\n')}`,
  )
  .join('\n\n')}
`,
)

console.log(`[prerender] ${2 + catalog.lines.length} páginas, 404.html, sitemap.xml (${urls.length} direcciones) y llms.txt`)
