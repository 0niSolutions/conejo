// Transformación entre formas SVG: cada trazo se convierte en la misma cantidad de puntos, así una forma
// puede deformarse en otra punto por punto en vez de desaparecer y aparecer.

const NS = 'http://www.w3.org/2000/svg'
let measurer = null

function getMeasurer() {
  if (!measurer) {
    const svg = document.createElementNS(NS, 'svg')
    svg.setAttribute('aria-hidden', 'true')
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden'
    measurer = document.createElementNS(NS, 'path')
    svg.appendChild(measurer)
    document.body.appendChild(svg)
  }
  return measurer
}

// Reparte `count` puntos a la misma distancia a lo largo del trazo.
function sample(d, count, closed) {
  const path = getMeasurer()
  path.setAttribute('d', d)
  const length = path.getTotalLength()
  const step = closed ? length / count : length / (count - 1)
  return Array.from({ length: count }, (_, i) => {
    const { x, y } = path.getPointAtLength(i * step)
    return [x, y]
  })
}

function signedArea(points) {
  let area = 0
  points.forEach(([x1, y1], i) => {
    const [x2, y2] = points[(i + 1) % points.length]
    area += x1 * y2 - x2 * y1
  })
  return area
}

// Elige desde qué punto arranca la figura para que quede lo más parecida posible a la de referencia:
// así al transformarse no se retuerce.
function alignTo(points, reference) {
  const ring = signedArea(points) < 0 === signedArea(reference) < 0 ? points : [...points].reverse()
  let best = 0
  let bestCost = Infinity
  for (let offset = 0; offset < ring.length; offset++) {
    let cost = 0
    for (let i = 0; i < ring.length && cost < bestCost; i++) {
      const [x1, y1] = ring[(i + offset) % ring.length]
      const [x2, y2] = reference[i]
      cost += (x1 - x2) ** 2 + (y1 - y2) ** 2
    }
    if (cost < bestCost) {
      bestCost = cost
      best = offset
    }
  }
  return ring.map((_, i) => ring[(i + best) % ring.length])
}

// Las líneas abiertas siempre van de izquierda a derecha.
const orient = (points) => (points[0][0] <= points.at(-1)[0] ? points : [...points].reverse())

// shapes: [{ parts: { nombre: d } }]; spec: { nombre: { points, closed } }.
// Devuelve, para cada forma, sus partes ya convertidas en puntos y alineadas con la primera.
export function prepareShapes(shapes, spec) {
  const prepared = shapes.map(() => ({}))
  for (const [part, { points, closed }] of Object.entries(spec)) {
    const reference = closed ? sample(shapes[0].parts[part], points, true) : null
    shapes.forEach((shape, i) => {
      const sampled = sample(shape.parts[part], points, closed)
      prepared[i][part] = closed ? (i === 0 ? reference : alignTo(sampled, reference)) : orient(sampled)
    })
  }
  return prepared
}

export function mixPoints(from, to, t, closed) {
  let d = ''
  for (let i = 0; i < from.length; i++) {
    const x = from[i][0] + (to[i][0] - from[i][0]) * t
    const y = from[i][1] + (to[i][1] - from[i][1]) * t
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
  }
  return closed ? `${d}Z` : d
}

export const mix = (a, b, t) => a + (b - a) * t

export const easeInOut = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2)
