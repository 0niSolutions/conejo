export const INSTAGRAM_URL = 'https://www.instagram.com/conejo.08/'
export const WHATSAPP_URL = 'https://wa.me/5493875269754'
export const ONI_URL = 'https://www.onisolutions.com.ar/'

export const NAV_LINKS = [
  { id: 'inicio', label: 'Inicio', href: '#inicio' },
  { id: 'sobre-mi', label: 'Sobre mí', href: '#sobre-mi' },
  { id: 'productos', label: 'Productos', href: '#/productos' },
  { id: 'redes', label: 'Redes', href: '#redes' },
]

export const STATS = [
  { value: 1015, label: 'seguidores en Instagram' },
  { value: 7, label: 'líneas de productos' },
  { value: 24, suffix: '/7', label: 'atención, todos los días' },
]

// `photo` acepta una ruta (ej. '/productos/mochila.jpg'): si está, reemplaza a la ilustración.
export const PRODUCTS = [
  {
    name: 'Riñoneras',
    slug: 'rinoneras',
    text: 'Lo justo y necesario, siempre a mano.',
    photo: null,
    lines: [
      'M30 95Q30 70 60 70H140Q170 70 170 95Q170 140 100 145Q30 140 30 95Z',
      'M42 92Q100 80 158 92',
      'M30 92H8M170 92H192',
      'M150 90V104',
    ],
    stitch: 'M40 102Q45 130 100 134Q155 130 160 102',
  },
  {
    name: 'Mochilas',
    slug: 'mochilas',
    text: 'Para todos los días, lista para lo que venga.',
    photo: null,
    lines: [
      'M55 65Q55 30 100 30Q145 30 145 65L155 165Q155 178 142 178H58Q45 178 45 165Z',
      'M85 30Q100 12 115 30',
      'M55 70Q100 95 145 70',
      'M68 115H132V155Q132 165 122 165H78Q68 165 68 155Z',
      'M100 83V105',
    ],
    stitch: 'M74 122H126V152Q126 159 118 159H82Q74 159 74 152Z',
  },
  {
    name: 'Bolsos',
    slug: 'bolsos',
    text: 'Espacio de sobra y terminaciones a mano.',
    photo: null,
    lines: [
      'M35 75H165L175 170Q176 180 165 180H35Q24 180 25 170Z',
      'M70 75Q70 25 100 25Q130 25 130 75',
    ],
    stitch: 'M42 84H158L166 172H34Z',
  },
  {
    name: 'Fundas de guitarra',
    slug: 'fundas-de-guitarra',
    text: 'Tu instrumento merece viajar cuidado.',
    photo: null,
    lines: [
      'M100 12C112 12 114 22 112 34L110 72C110 80 128 82 130 96C132 108 122 112 122 118C122 124 142 128 142 152C142 176 122 188 100 188C78 188 58 176 58 152C58 128 78 124 78 118C78 112 68 108 70 96C72 82 90 80 90 72L88 34C86 22 88 12 100 12Z',
      'M80 135H120V168H80Z',
    ],
    stitch: 'M100 24V126',
  },
  {
    name: 'Materos',
    slug: 'materos',
    text: 'El equipo de mate, siempre listo.',
    photo: null,
    lines: [
      'M60 70H140L146 170Q146 180 136 180H64Q54 180 54 170Z',
      'M85 70V40Q85 30 100 30Q115 30 115 40V70',
      'M60 78Q20 20 100 12Q180 20 140 78',
      'M70 110H130V160H70Z',
    ],
    stitch: 'M76 116H124V154H76Z',
  },
  {
    name: 'Bandoleras',
    slug: 'bandoleras',
    text: 'Cómoda, cruzada y hecha a mano.',
    photo: null,
    lines: [
      'M40 85H160Q168 85 168 95V165Q168 175 158 175H42Q32 175 32 165V95Q32 85 40 85Z',
      'M32 95V125Q100 155 168 125V95',
      'M40 85Q20 20 100 12Q180 20 160 85',
      'M92 132H108V152H92Z',
    ],
    stitch: 'M40 100V120Q100 146 160 120V100',
  },
  {
    name: 'Botiquines',
    slug: 'botiquines',
    text: 'Todo ordenado para cuando hace falta.',
    photo: null,
    lines: [
      'M30 65H170Q180 65 180 75V165Q180 175 170 175H30Q20 175 20 165V75Q20 65 30 65Z',
      'M75 65V50Q75 40 85 40H115Q125 40 125 50V65',
      'M92 95H108V110H123V126H108V141H92V126H77V110H92Z',
    ],
    stitch: 'M30 75H170V165H30Z',
  },
]

// Productos de ejemplo: reemplazar por los reales. `tag` es el `slug` de la línea a la que pertenece;
// `photo` funciona igual que en PRODUCTS.
export const CATALOG = [
  { id: 'rinonera-clasica', tag: 'rinoneras', name: 'Riñonera Clásica', text: 'Un cierre, un bolsillo y listo.', price: 24000, photo: null },
  { id: 'rinonera-urbana', tag: 'rinoneras', name: 'Riñonera Urbana', text: 'Compacta para andar por la ciudad.', price: 28000, photo: null },
  { id: 'rinonera-doble', tag: 'rinoneras', name: 'Riñonera Doble', text: 'Dos compartimentos bien separados.', price: 32000, photo: null },
  { id: 'rinonera-mini', tag: 'rinoneras', name: 'Riñonera Mini', text: 'Celular, llaves y poco más.', price: 21000, photo: null },
  { id: 'rinonera-viajera', tag: 'rinoneras', name: 'Riñonera Viajera', text: 'Bolsillo interno para los documentos.', price: 35000, photo: null },
  { id: 'rinonera-cruzada', tag: 'rinoneras', name: 'Riñonera Cruzada', text: 'Correa larga para usarla al pecho.', price: 30000, photo: null },

  { id: 'mochila-diaria', tag: 'mochilas', name: 'Mochila Diaria', text: 'Lo que necesitás para salir todos los días.', price: 62000, photo: null },
  { id: 'mochila-urbana', tag: 'mochilas', name: 'Mochila Urbana', text: 'Liviana y con espacio para la notebook.', price: 74000, photo: null },
  { id: 'mochila-viajera', tag: 'mochilas', name: 'Mochila Viajera', text: 'Gran capacidad para escapadas largas.', price: 89000, photo: null },
  { id: 'mochila-mini', tag: 'mochilas', name: 'Mochila Mini', text: 'Chica por fuera, justa por dentro.', price: 52000, photo: null },
  { id: 'mochila-solapa', tag: 'mochilas', name: 'Mochila Solapa', text: 'Cierre con solapa y hebillas.', price: 78000, photo: null },
  { id: 'mochila-escolar', tag: 'mochilas', name: 'Mochila Escolar', text: 'Resistente para el trajín de todo el año.', price: 58000, photo: null },

  { id: 'bolso-fin-de-semana', tag: 'bolsos', name: 'Bolso Fin de Semana', text: 'Dos días de ropa, sin apretar.', price: 85000, photo: null },
  { id: 'bolso-deportivo', tag: 'bolsos', name: 'Bolso Deportivo', text: 'Con lugar aparte para las zapatillas.', price: 69000, photo: null },
  { id: 'bolso-de-mano', tag: 'bolsos', name: 'Bolso de Mano', text: 'Asas cortas y mucha presencia.', price: 64000, photo: null },
  { id: 'bolso-de-viaje', tag: 'bolsos', name: 'Bolso de Viaje', text: 'Amplio, con correa para el hombro.', price: 98000, photo: null },
  { id: 'bolso-tote', tag: 'bolsos', name: 'Bolso Tote', text: 'Abierto, simple y para todo.', price: 49000, photo: null },
  { id: 'bolso-matero', tag: 'bolsos', name: 'Bolso Matero', text: 'Espacio para el termo y algo más.', price: 56000, photo: null },

  { id: 'funda-criolla', tag: 'fundas-de-guitarra', name: 'Funda Criolla', text: 'A la medida de la guitarra criolla.', price: 92000, photo: null },
  { id: 'funda-acustica', tag: 'fundas-de-guitarra', name: 'Funda Acústica', text: 'Para caja grande, con bolsillo frontal.', price: 99000, photo: null },
  { id: 'funda-electrica', tag: 'fundas-de-guitarra', name: 'Funda Eléctrica', text: 'Delgada y con espacio para cables.', price: 88000, photo: null },
  { id: 'funda-bajo', tag: 'fundas-de-guitarra', name: 'Funda de Bajo', text: 'Larga, con refuerzo en el mástil.', price: 105000, photo: null },
  { id: 'funda-ukelele', tag: 'fundas-de-guitarra', name: 'Funda de Ukelele', text: 'Chiquita y bien protegida.', price: 48000, photo: null },
  { id: 'funda-charango', tag: 'fundas-de-guitarra', name: 'Funda de Charango', text: 'Para llevarlo a todas las peñas.', price: 54000, photo: null },

  { id: 'matero-clasico', tag: 'materos', name: 'Matero Clásico', text: 'Termo, mate y yerbera en su lugar.', price: 46000, photo: null },
  { id: 'matero-cilindrico', tag: 'materos', name: 'Matero Cilíndrico', text: 'Con la forma justa para el termo.', price: 42000, photo: null },
  { id: 'matero-rigido', tag: 'materos', name: 'Matero Rígido', text: 'Mantiene la forma, lleno o vacío.', price: 55000, photo: null },
  { id: 'matero-viajero', tag: 'materos', name: 'Matero Viajero', text: 'Correa larga y bolsillo para bizcochos.', price: 51000, photo: null },
  { id: 'matero-compacto', tag: 'materos', name: 'Matero Compacto', text: 'Para termos de medio litro.', price: 38000, photo: null },
  { id: 'matero-doble', tag: 'materos', name: 'Matero Doble', text: 'Lugar para dos termos en la ronda.', price: 63000, photo: null },

  { id: 'bandolera-clasica', tag: 'bandoleras', name: 'Bandolera Clásica', text: 'Simple, cruzada y de todos los días.', price: 36000, photo: null },
  { id: 'bandolera-solapa', tag: 'bandoleras', name: 'Bandolera Solapa', text: 'Cierre con solapa y broche.', price: 41000, photo: null },
  { id: 'bandolera-mini', tag: 'bandoleras', name: 'Bandolera Mini', text: 'Para llevar solo lo esencial.', price: 29000, photo: null },
  { id: 'bandolera-tablet', tag: 'bandoleras', name: 'Bandolera Tablet', text: 'Un compartimento para la tablet.', price: 47000, photo: null },
  { id: 'bandolera-fotografo', tag: 'bandoleras', name: 'Bandolera Fotógrafo', text: 'Lugar para la cámara y un lente.', price: 59000, photo: null },
  { id: 'bandolera-doble-cierre', tag: 'bandoleras', name: 'Bandolera Doble Cierre', text: 'Dos cierres para tener todo a mano.', price: 44000, photo: null },

  { id: 'botiquin-hogar', tag: 'botiquines', name: 'Botiquín Hogar', text: 'Lo de siempre, en un solo lugar.', price: 33000, photo: null },
  { id: 'botiquin-viaje', tag: 'botiquines', name: 'Botiquín de Viaje', text: 'Compacto para la valija.', price: 27000, photo: null },
  { id: 'botiquin-auto', tag: 'botiquines', name: 'Botiquín para Auto', text: 'Fácil de encontrar cuando hace falta.', price: 31000, photo: null },
  { id: 'botiquin-trekking', tag: 'botiquines', name: 'Botiquín de Trekking', text: 'Liviano y con anclaje a la mochila.', price: 36000, photo: null },
  { id: 'botiquin-mini', tag: 'botiquines', name: 'Botiquín Mini', text: 'Para la cartera o la riñonera.', price: 19000, photo: null },
  { id: 'botiquin-familiar', tag: 'botiquines', name: 'Botiquín Familiar', text: 'Divisiones para ordenar de todo.', price: 45000, photo: null },
]

export function formatPrice(value) {
  return value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
}
