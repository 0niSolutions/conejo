import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, animate, motion, useInView, useReducedMotion } from 'motion/react'
import Logo from './Logo'
import { easeInOut, mix, mixPoints, prepareShapes } from './morph'

// Las mismas piezas en todos los productos, para que cada una se deforme en su equivalente:
// la correa de la mochila pasa a ser el cinturón de la riñonera, las asas del bolso, etc.
// `logo` es [x, y, tamaño] del parche. viewBox 500 × 600.
const SHAPES = [
  {
    name: 'Mochila',
    logo: [164, 340, 172],
    parts: {
      strap: 'M196 90Q196 26 250 26Q304 26 304 90',
      body: 'M112 172Q112 92 250 92Q388 92 388 172L412 522Q414 566 370 566H130Q86 566 88 522Z',
      flap: 'M112 176Q250 278 388 176Q386 96 250 96Q114 96 112 176Z',
      pocket: 'M132 318H368Q382 318 382 332V520Q382 536 366 536H134Q118 536 118 520V332Q118 318 132 318Z',
      tabL: 'M167 196H193V306H167Z',
      tabR: 'M307 196H333V306H307Z',
      buckleL: 'M161 270H199V294H161Z',
      buckleR: 'M301 270H339V294H301Z',
      barL: 'M178 272H182V292H178Z',
      barR: 'M318 272H322V292H318Z',
      stitchTop: 'M122 172Q124 112 250 110Q376 112 378 172',
      stitchBody: 'M104 300 100 520Q100 552 130 552H370Q400 552 400 520L396 300',
      stitchPocket: 'M132 332H368V522H132Z',
    },
  },
  {
    name: 'Riñonera',
    logo: [212, 322, 76],
    parts: {
      strap: 'M20 300Q250 250 480 300',
      body: 'M90 330Q90 250 180 245H320Q410 250 410 330Q410 430 250 440Q90 430 90 330Z',
      flap: 'M95 300Q250 262 405 300Q400 252 320 248H180Q100 252 95 300Z',
      pocket: 'M140 330Q250 312 360 330Q360 405 250 412Q140 405 140 330Z',
      tabL: 'M68 290H96V322H68Z',
      tabR: 'M404 290H432V322H404Z',
      buckleL: 'M42 284H70V328H42Z',
      buckleR: 'M430 284H458V328H430Z',
      barL: 'M54 286H58V326H54Z',
      barR: 'M442 286H446V326H442Z',
      stitchTop: 'M104 296Q250 266 396 296',
      stitchBody: 'M100 340Q104 422 250 428Q396 422 400 340',
      stitchPocket: 'M152 336Q250 322 348 336Q346 396 250 400Q154 396 152 336Z',
    },
  },
  {
    name: 'Bolso',
    logo: [195, 396, 110],
    parts: {
      strap: 'M170 250Q170 120 250 120Q330 120 330 250',
      body: 'M80 260H420L440 540Q442 566 414 566H86Q58 566 60 540Z',
      flap: 'M80 260H420L424 320Q250 336 76 320Z',
      pocket: 'M140 380H360Q372 380 372 392V510Q372 522 360 522H140Q128 522 128 510V392Q128 380 140 380Z',
      tabL: 'M158 236H182V300H158Z',
      tabR: 'M318 236H342V300H318Z',
      buckleL: 'M152 276H188V300H152Z',
      buckleR: 'M312 276H348V300H312Z',
      barL: 'M168 278H172V298H168Z',
      barR: 'M328 278H332V298H328Z',
      stitchTop: 'M86 300Q250 314 414 300',
      stitchBody: 'M90 330 88 536Q88 548 100 548H400Q412 548 412 536L410 330',
      stitchPocket: 'M142 392H358V510H142Z',
    },
  },
  {
    name: 'Funda de guitarra',
    logo: [215, 250, 70],
    parts: {
      strap: 'M345 400Q420 400 420 455Q420 510 340 505',
      body: 'M250 20C279 20 284 51 279 87L274 203C274 227 317 234 322 276C327 313 303 325 303 343C303 362 351 374 351 447C351 520 303 557 250 557C197 557 149 520 149 447C149 374 197 362 197 343C197 325 173 313 178 276C183 234 226 227 226 203L221 87C216 51 221 20 250 20Z',
      flap: 'M232 24H268Q280 24 278 44L274 200H226L222 44Q220 24 232 24Z',
      pocket: 'M200 420H300Q310 420 310 430V500Q310 510 300 510H200Q190 510 190 500V430Q190 420 200 420Z',
      tabL: 'M334 392H356V410H334Z',
      tabR: 'M330 496H352V514H330Z',
      buckleL: 'M354 390H372V412H354Z',
      buckleR: 'M350 494H368V516H350Z',
      barL: 'M361 393H365V409H361Z',
      barR: 'M357 497H361V513H357Z',
      stitchTop: 'M250 40 250 200',
      stitchBody: 'M170 400Q160 520 250 540Q340 520 330 400',
      stitchPocket: 'M200 430H300V500H200Z',
    },
  },
  {
    name: 'Matero',
    logo: [200, 385, 100],
    parts: {
      strap: 'M150 200Q120 20 250 20Q380 20 350 200',
      body: 'M150 200Q150 160 190 160H310Q350 160 350 200L362 540Q364 566 336 566H164Q136 566 138 540Z',
      flap: 'M150 205Q250 240 350 205Q350 160 310 158H190Q150 160 150 205Z',
      pocket: 'M180 360H320Q332 360 332 372V500Q332 512 320 512H180Q168 512 168 500V372Q168 360 180 360Z',
      tabL: 'M138 190H156V240H138Z',
      tabR: 'M344 190H362V240H344Z',
      buckleL: 'M134 222H160V246H134Z',
      buckleR: 'M340 222H366V246H340Z',
      barL: 'M145 224H149V244H145Z',
      barR: 'M351 224H355V244H351Z',
      stitchTop: 'M158 200Q250 226 342 200',
      stitchBody: 'M158 260 156 534Q156 546 168 546H332Q344 546 344 534L342 260',
      stitchPocket: 'M182 374H318V498H182Z',
    },
  },
  {
    name: 'Bandolera',
    logo: [205, 314, 90],
    parts: {
      strap: 'M118 300Q110 70 250 60Q390 70 382 300',
      body: 'M130 290H370Q392 290 392 312V506Q392 528 370 528H130Q108 528 108 506V312Q108 290 130 290Z',
      flap: 'M108 312Q108 290 130 290H370Q392 290 392 312V420Q250 450 108 420Z',
      pocket: 'M150 450H350Q358 450 358 458V496Q358 504 350 504H150Q142 504 142 496V458Q142 450 150 450Z',
      tabL: 'M190 380H214V470H190Z',
      tabR: 'M286 380H310V470H286Z',
      buckleL: 'M184 438H220V462H184Z',
      buckleR: 'M280 438H316V462H280Z',
      barL: 'M200 440H204V460H200Z',
      barR: 'M296 440H300V460H296Z',
      stitchTop: 'M120 306Q250 300 380 306',
      stitchBody: 'M118 330 118 506Q118 518 130 518H370Q382 518 382 506L382 330',
      stitchPocket: 'M124 304H376V414Q250 440 124 414Z',
    },
  },
  {
    name: 'Botiquín',
    logo: [227, 387, 46],
    parts: {
      strap: 'M200 230Q200 170 250 170Q300 170 300 230',
      body: 'M100 240H400Q424 240 424 264V500Q424 524 400 524H100Q76 524 76 500V264Q76 240 100 240Z',
      flap: 'M76 264Q76 240 100 240H400Q424 240 424 264V300H76Z',
      // El bolsillo es la cruz, con el logo en el centro.
      pocket: 'M225 340H275V385H320V435H275V480H225V435H180V385H225Z',
      tabL: 'M150 286H174V320H150Z',
      tabR: 'M326 286H350V320H326Z',
      buckleL: 'M144 300H180V324H144Z',
      buckleR: 'M320 300H356V324H320Z',
      barL: 'M160 302H164V322H160Z',
      barR: 'M336 302H340V322H336Z',
      stitchTop: 'M86 296H414',
      stitchBody: 'M88 312 88 500Q88 512 100 512H400Q412 512 412 500L412 312',
      stitchPocket: 'M233 348H267V393H312V427H267V472H233V427H188V393H233Z',
    },
  },
  {
    name: 'Pechera',
    logo: [210, 392, 80],
    parts: {
      // Los dos tiradores que suben a los hombros.
      strap: 'M150 300L200 70Q250 40 300 70L350 300',
      body: 'M130 290H370Q394 290 394 314V486Q394 510 370 510H130Q106 510 106 486V314Q106 290 130 290Z',
      flap: 'M106 314Q106 290 130 290H370Q394 290 394 314V350H106Z',
      pocket: 'M150 380H350Q360 380 360 390V474Q360 484 350 484H150Q140 484 140 474V390Q140 380 150 380Z',
      tabL: 'M50 380H106V396H50Z',
      tabR: 'M394 380H450V396H394Z',
      buckleL: 'M30 374H56V402H30Z',
      buckleR: 'M444 374H470V402H444Z',
      barL: 'M41 376H45V400H41Z',
      barR: 'M455 376H459V400H455Z',
      stitchTop: 'M116 344H384',
      stitchBody: 'M116 362 116 488Q116 500 128 500H372Q384 500 384 488L384 362',
      stitchPocket: 'M152 392H348V472H152Z',
    },
  },
  {
    name: 'Muslera',
    logo: [212, 405, 76],
    parts: {
      strap: 'M40 150Q250 210 460 150',
      body: 'M160 260H340Q364 260 364 284V490Q364 530 324 530H176Q136 530 136 490V284Q136 260 160 260Z',
      flap: 'M136 284Q136 260 160 260H340Q364 260 364 284V330Q250 370 136 330Z',
      pocket: 'M170 390H330Q340 390 340 400V486Q340 506 320 506H180Q160 506 160 486V400Q160 390 170 390Z',
      tabL: 'M190 176H210V262H190Z',
      tabR: 'M290 176H310V262H290Z',
      // La correa de la pierna, a los costados.
      buckleL: 'M96 424H136V440H96Z',
      buckleR: 'M364 424H404V440H364Z',
      barL: 'M82 418H98V446H82Z',
      barR: 'M402 418H418V446H402Z',
      stitchTop: 'M146 326Q250 360 354 326',
      stitchBody: 'M146 342 146 490Q146 520 176 520H324Q354 520 354 490L354 342',
      stitchPocket: 'M172 400H328V494H172Z',
    },
  },
  {
    name: 'Oficio',
    logo: [210, 400, 80],
    parts: {
      strap: 'M20 200H480',
      body: 'M110 215H390L372 520Q370 545 345 545H155Q130 545 128 520Z',
      flap: 'M110 215H390V262H110Z',
      pocket: 'M150 360H350L340 500Q338 515 322 515H178Q162 515 160 500Z',
      // Un martillo y un destornillador que asoman del portaherramientas.
      tabL: 'M170 110H190V215H170Z',
      tabR: 'M300 130H322V215H300Z',
      buckleL: 'M140 92H220V118H140Z',
      buckleR: 'M296 96H326V134H296Z',
      barL: 'M60 190H70V210H60Z',
      barR: 'M430 190H440V210H430Z',
      stitchTop: 'M118 252H382',
      stitchBody: 'M118 280 136 516Q138 534 158 534H342Q362 534 364 516L382 280',
      stitchPocket: 'M162 372H338L330 494H170Z',
    },
  },
]

// Cuántos puntos usa cada pieza, si es cerrada, y cuánto se demora en arrancar (en fracción del cambio):
// el desfase hace que la forma "fluya" en vez de moverse en bloque.
const PARTS = {
  strap: { points: 120, closed: false, delay: 0 },
  body: { points: 260, closed: true, delay: 0.04 },
  flap: { points: 200, closed: true, delay: 0.1 },
  pocket: { points: 180, closed: true, delay: 0.14 },
  tabL: { points: 48, closed: true, delay: 0.16 },
  tabR: { points: 48, closed: true, delay: 0.18 },
  buckleL: { points: 48, closed: true, delay: 0.17 },
  buckleR: { points: 48, closed: true, delay: 0.19 },
  barL: { points: 24, closed: true, delay: 0.17 },
  barR: { points: 24, closed: true, delay: 0.19 },
  stitchTop: { points: 160, closed: false, delay: 0.12 },
  stitchBody: { points: 220, closed: false, delay: 0.08 },
  stitchPocket: { points: 180, closed: true, delay: 0.16 },
}
const MAX_DELAY = 0.22
const LOGO_DELAY = 0.2

const HOLD_MS = 2600
const MORPH_S = 1.5
const FIRST_HOLD_MS = 4200

const START = SHAPES[0].parts

// Se calcula una sola vez, la primera vez que hace falta (necesita el navegador para medir los trazos).
let prepared = null

// Costura punteada que se revela al principio con una máscara, como si se fuera cosiendo.
function Stitch({ part, play, delay, duration }) {
  const id = useId()
  return (
    <>
      <mask id={id} maskUnits="userSpaceOnUse" x="-40" y="-40" width="580" height="680">
        <motion.path
          data-part={part}
          d={START[part]}
          fill="none"
          stroke="#fff"
          strokeWidth="8"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: play ? 1 : 0 }}
          transition={{ duration, delay, ease: 'easeInOut' }}
        />
      </mask>
      <g mask={`url(#${id})`}>
        <path data-part={part} d={START[part]} fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="11 9" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </>
  )
}

// El producto del inicio: arranca como mochila y se va transformando en los demás.
export default function HeroBag({ play }) {
  const svg = useRef(null)
  const logo = useRef(null)
  const squash = useRef(null)
  const inView = useInView(svg, { amount: 0.3 })
  const reducedMotion = useReducedMotion()
  const [index, setIndex] = useState(0)
  const current = useRef(0)
  const started = useRef(false)

  useEffect(() => {
    if (!play || !inView || reducedMotion) return
    let controls
    let cancelled = false
    prepared ??= prepareShapes(SHAPES, PARTS)
    const nodes = Object.fromEntries(Object.keys(PARTS).map((part) => [part, svg.current.querySelectorAll(`[data-part="${part}"]`)]))
    const logoNode = logo.current
    const squashNode = squash.current

    function draw(from, to, t) {
      for (const [part, { closed, delay }] of Object.entries(PARTS)) {
        const local = easeInOut(Math.min(1, Math.max(0, (t - delay) / (1 - MAX_DELAY))))
        const d = mixPoints(prepared[from][part], prepared[to][part], local, closed)
        nodes[part].forEach((node) => node.setAttribute('d', d))
      }
      const l = easeInOut(Math.min(1, Math.max(0, (t - LOGO_DELAY) / (1 - LOGO_DELAY))))
      const [x1, y1, s1] = SHAPES[from].logo
      const [x2, y2, s2] = SHAPES[to].logo
      logoNode.setAttribute('transform', `translate(${mix(x1, x2, l)} ${mix(y1, y2, l)}) scale(${mix(s1, s2, l) / 100})`)
      // Se aplasta y estira un poco mientras cambia, como si fuera de cuero blando.
      const wave = Math.sin(Math.PI * t)
      const sx = 1 + 0.05 * wave
      const sy = 1 - 0.07 * wave
      const tilt = 3 * Math.sin(2 * Math.PI * t)
      squashNode.setAttribute('transform', `translate(250 560) rotate(${tilt}) scale(${sx} ${sy}) translate(-250 -560)`)
    }

    function next() {
      if (cancelled) return
      const from = current.current
      const to = (from + 1) % SHAPES.length
      controls = animate(0, 1, {
        duration: MORPH_S,
        ease: 'linear',
        onUpdate: (t) => draw(from, to, t),
        onComplete: () => {
          current.current = to
          timer = setTimeout(next, HOLD_MS)
        },
      })
      // El nombre cambia a mitad de la transformación, cuando la forma ya se parece al producto nuevo.
      halfway = setTimeout(() => !cancelled && setIndex(to), (MORPH_S * 1000) / 2)
    }

    let halfway
    let timer = setTimeout(next, started.current ? HOLD_MS : FIRST_HOLD_MS)
    started.current = true
    return () => {
      cancelled = true
      clearTimeout(timer)
      clearTimeout(halfway)
      controls?.stop()
      // Si se cortó a mitad de camino, deja la forma completa del producto actual.
      draw(current.current, current.current, 1)
      setIndex(current.current)
    }
  }, [play, inView, reducedMotion])

  const name = SHAPES[index].name
  const [lx, ly, ls] = SHAPES[0].logo

  return (
    <div className="relative size-full">
      <svg ref={svg} viewBox="0 0 500 600" className="size-full overflow-visible" role="img" aria-label={`${name} con el logo de Conejo`}>
        <defs>
          <linearGradient id="bag-body" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#3f3f3f" />
            <stop offset="0.5" stopColor="#222" />
            <stop offset="1" stopColor="#0e0e0e" />
          </linearGradient>
          <linearGradient id="bag-panel" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#383838" />
            <stop offset="1" stopColor="#161616" />
          </linearGradient>
        </defs>

        <g ref={squash}>
          <path data-part="strap" d={START.strap} fill="none" stroke="#2c2c2c" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round" />
          <path data-part="strap" d={START.strap} fill="none" stroke="#000" strokeWidth="1.5" strokeDasharray="6 6" />
          <path data-part="body" d={START.body} fill="url(#bag-body)" stroke="#4a4a4a" strokeWidth="2" strokeLinejoin="round" />
          <path data-part="flap" d={START.flap} fill="url(#bag-panel)" stroke="#000" strokeWidth="2" strokeLinejoin="round" />
          <path data-part="pocket" d={START.pocket} fill="url(#bag-panel)" stroke="#000" strokeWidth="2" strokeLinejoin="round" />

          {['L', 'R'].map((side) => (
            <g key={side}>
              <path data-part={`tab${side}`} d={START[`tab${side}`]} fill="#0f0f0f" stroke="#3d3d3d" strokeLinejoin="round" />
              <path data-part={`buckle${side}`} d={START[`buckle${side}`]} fill="none" stroke="#b9b9b9" strokeWidth="4" strokeLinejoin="round" />
              <path data-part={`bar${side}`} d={START[`bar${side}`]} fill="#b9b9b9" />
            </g>
          ))}

          <g className="text-bone">
            <Stitch part="stitchTop" play={play} delay={0.5} duration={1.3} />
            <Stitch part="stitchBody" play={play} delay={0.9} duration={2} />
            <Stitch part="stitchPocket" play={play} delay={1.5} duration={1.6} />
          </g>

          <g ref={logo} transform={`translate(${lx} ${ly}) scale(${ls / 100})`}>
            <motion.g
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              initial={{ scale: 0, rotate: -120 }}
              animate={play ? { scale: 1, rotate: 0 } : {}}
              transition={{ type: 'spring', stiffness: 120, damping: 13, delay: 1.2 }}
            >
              <Logo mono x="0" y="0" width="100" height="100" />
              {/* Copia a color encima: aparece al pasar el mouse por el logo. */}
              <Logo aria-hidden="true" x="0" y="0" width="100" height="100" className="pointer-events-auto opacity-0 transition-opacity duration-500 hover:opacity-100" />
            </motion.g>
          </g>
        </g>
      </svg>

      <div aria-hidden="true" className="absolute inset-x-0 -bottom-2 flex justify-center">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={name}
            className="-rotate-3 font-brush text-3xl text-bone/80 sm:text-4xl"
            initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
            // La primera vez espera a que la mochila termine de coserse; después cambia enseguida.
            animate={{ opacity: play ? 1 : 0, y: 0, filter: 'blur(0px)', transition: { duration: 0.35, delay: play && !started.current ? 2.6 : 0 } }}
            exit={{ opacity: 0, y: -14, filter: 'blur(6px)', transition: { duration: 0.25 } }}
          >
            {name}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  )
}
