export const INSTAGRAM_URL = 'https://www.instagram.com/conejo.08/'
export const WHATSAPP_URL = 'https://wa.link/y0o2yn'

export const NAV_LINKS = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'sobre-mi', label: 'Sobre mí' },
  { id: 'productos', label: 'Productos' },
  { id: 'como-pedir', label: 'Cómo pedir' },
  { id: 'redes', label: 'Redes' },
]

export const STATS = [
  { value: 1015, label: 'seguidores en Instagram' },
  { value: 7, label: 'líneas de productos' },
  { value: 24, suffix: '/7', label: 'atención, todos los días' },
]

export const STEPS = [
  { title: 'Escribime', text: 'Mandame un mensaje por WhatsApp, cualquier día y a cualquier hora.' },
  { title: 'Contame qué buscás', text: 'Qué producto necesitás, para qué lo vas a usar y qué te imaginás.' },
  { title: 'Lo personalizamos', text: 'Definimos juntos los detalles para que sea bien tuyo.' },
  { title: 'Ya es tuyo', text: 'Lo hago en Salta Capital y coordinamos la entrega por mensaje.' },
]

// `photo` acepta una ruta (ej. '/productos/mochila.jpg'): si está, reemplaza a la ilustración.
export const PRODUCTS = [
  {
    name: 'Riñoneras',
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
    text: 'Para todos los días, con tu impronta.',
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
    text: 'Espacio de sobra y un diseño que es tuyo.',
    photo: null,
    lines: [
      'M35 75H165L175 170Q176 180 165 180H35Q24 180 25 170Z',
      'M70 75Q70 25 100 25Q130 25 130 75',
    ],
    stitch: 'M42 84H158L166 172H34Z',
  },
  {
    name: 'Fundas de guitarra',
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
    text: 'Cómoda, cruzada y hecha a tu gusto.',
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
