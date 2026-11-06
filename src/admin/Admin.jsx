import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowDown, ArrowUp, Check, CircleAlert, ExternalLink, LoaderCircle, LogOut, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { formatPrice } from '../data'
import { SESSION_EXPIRED, getSession, loadCatalog, logout, matches, parsePrice, saveCatalog, uniqueSlug } from './api'
import Login from './Login'
import { Badge, Drawer, Field, ICON_BUTTON, INPUT, PRIMARY, PhotoPicker, SECONDARY, Thumb, Toggle } from './parts'

function swap(list, a, b) {
  const next = [...list]
  ;[next[a], next[b]] = [next[b], next[a]]
  return next
}

function MoveButtons({ name, index, total, onMove }) {
  return (
    <div className="flex">
      <button type="button" aria-label={`Subir ${name}`} className={ICON_BUTTON} disabled={index === 0} onClick={() => onMove(-1)}>
        <ArrowUp className="size-4" />
      </button>
      <button type="button" aria-label={`Bajar ${name}`} className={ICON_BUTTON} disabled={index === total - 1} onClick={() => onMove(1)}>
        <ArrowDown className="size-4" />
      </button>
    </div>
  )
}

// Borrador del formulario y si cambió respecto de cómo se abrió.
function useDraft(initial) {
  const [draft, setDraft] = useState(initial)
  const start = useRef(JSON.stringify(initial))
  const dirty = JSON.stringify(draft) !== start.current
  const set = (field) => (value) => setDraft((current) => ({ ...current, [field]: value }))
  return { draft, setDraft, set, dirty }
}

function confirmDiscard(dirty) {
  return !dirty || window.confirm('Tenés cambios sin guardar. ¿Querés descartarlos?')
}

function ProductEditor({ product, catalog, defaultLine, onSave, onDelete, onClose }) {
  const { draft, setDraft, set, dirty } = useDraft(
    product
      ? { ...product, price: String(product.price) }
      : { name: '', line: defaultLine || catalog.lines[0].slug, text: '', price: '', photos: [], hidden: false, soldOut: false },
  )
  const [errors, setErrors] = useState({})
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const setPhotos = useMemo(() => (update) => setDraft((current) => ({ ...current, photos: update(current.photos) })), [setDraft])
  const close = () => confirmDiscard(dirty) && onClose()

  async function submit(event) {
    event.preventDefault()
    const price = parsePrice(draft.price)
    const found = {}
    if (!draft.name.trim()) found.name = 'Poné un nombre.'
    if (price === null) found.price = 'Poné el precio en pesos, solo números (por ejemplo 45000).'
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSaving(true)
    const saved = {
      id: product?.id ?? uniqueSlug(draft.name, new Set(catalog.products.map(({ id }) => id))),
      line: draft.line,
      name: draft.name.trim(),
      text: draft.text.trim(),
      price,
      photos: draft.photos,
      hidden: draft.hidden,
      soldOut: draft.soldOut,
    }
    const ok = await onSave(saved, !product)
    setSaving(false)
    if (ok) onClose()
  }

  return (
    <Drawer
      title={product ? `Editar ${product.name}` : 'Nuevo producto'}
      onClose={close}
      footer={
        <>
          <button type="submit" form="product-form" className={PRIMARY} disabled={saving || uploading}>
            {saving ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
            {uploading ? 'Esperando las fotos…' : product ? 'Guardar cambios' : 'Agregar producto'}
          </button>
          <button type="button" className={SECONDARY} onClick={close}>
            Cancelar
          </button>
          {product && (
            <button type="button" className={`${SECONDARY} ml-auto hover:border-sun-2 hover:text-sun-2`} onClick={() => onDelete(product)}>
              <Trash2 className="size-4" /> Borrar
            </button>
          )}
        </>
      }
    >
      <form id="product-form" className="space-y-5" onSubmit={submit} noValidate>
        <Field label="Nombre" error={errors.name}>
          <input className={INPUT} value={draft.name} onChange={(event) => set('name')(event.target.value)} placeholder="Riñonera Clásica" />
        </Field>
        <Field label="Línea">
          <select className={INPUT} value={draft.line} onChange={(event) => set('line')(event.target.value)}>
            {catalog.lines.map(({ slug, name }) => (
              <option key={slug} value={slug}>
                {name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Descripción" hint="Una frase corta. Se ve debajo del nombre.">
          <textarea className={`${INPUT} min-h-20 resize-y`} value={draft.text} onChange={(event) => set('text')(event.target.value)} />
        </Field>
        <Field label="Precio" error={errors.price} hint={parsePrice(draft.price) !== null ? `Se ve así: ${formatPrice(parsePrice(draft.price))}` : 'En pesos, sin centavos.'}>
          <input className={INPUT} inputMode="numeric" value={draft.price} onChange={(event) => set('price')(event.target.value)} placeholder="45000" />
        </Field>
        <div>
          <p className="text-sm font-semibold">Fotos</p>
          <p className="mt-0.5 mb-2 text-sm text-ash">La primera es la principal. Sin fotos, se muestra el dibujo de la línea.</p>
          <PhotoPicker photos={draft.photos} setPhotos={setPhotos} name={draft.name} onUploadingChange={setUploading} />
        </div>
        <div className="space-y-3">
          <Toggle label="Mostrar en la web" hint="Apagalo para esconderlo sin borrarlo." checked={!draft.hidden} onChange={(value) => set('hidden')(!value)} />
          <Toggle label="Sin stock" hint="Se sigue viendo, pero no se puede agregar al carrito." checked={draft.soldOut} onChange={set('soldOut')} />
        </div>
      </form>
    </Drawer>
  )
}

function LineEditor({ line, catalog, onSave, onDelete, onClose }) {
  const { draft, setDraft, set, dirty } = useDraft(line ? { ...line } : { name: '', text: '', photo: null, art: null })
  const [error, setError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const setPhotos = useMemo(() => (update) => setDraft((current) => ({ ...current, photo: update(current.photo ? [current.photo] : [])[0] ?? null })), [setDraft])
  const productCount = line ? catalog.products.filter((product) => product.line === line.slug).length : 0
  const close = () => confirmDiscard(dirty) && onClose()

  async function submit(event) {
    event.preventDefault()
    if (!draft.name.trim()) return setError('Poné un nombre.')
    setError(null)
    setSaving(true)
    const saved = {
      slug: line?.slug ?? uniqueSlug(draft.name, new Set(catalog.lines.map(({ slug }) => slug))),
      name: draft.name.trim(),
      text: draft.text.trim(),
      photo: draft.photo,
      art: draft.art ?? null,
    }
    const ok = await onSave(saved, !line)
    setSaving(false)
    if (ok) onClose()
  }

  return (
    <Drawer
      title={line ? `Editar ${line.name}` : 'Nueva línea'}
      onClose={close}
      footer={
        <>
          <button type="submit" form="line-form" className={PRIMARY} disabled={saving || uploading}>
            {saving ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
            {uploading ? 'Esperando la foto…' : line ? 'Guardar cambios' : 'Agregar línea'}
          </button>
          <button type="button" className={SECONDARY} onClick={close}>
            Cancelar
          </button>
          {line && (
            <button
              type="button"
              className={`${SECONDARY} ml-auto hover:border-sun-2 hover:text-sun-2`}
              disabled={productCount > 0}
              title={productCount > 0 ? 'Primero mové o borrá sus productos.' : undefined}
              onClick={() => onDelete(line)}
            >
              <Trash2 className="size-4" /> Borrar
            </button>
          )}
        </>
      }
    >
      <form id="line-form" className="space-y-5" onSubmit={submit} noValidate>
        <Field label="Nombre" error={error} hint="Se ve en el inicio, en los filtros y en la cinta animada.">
          <input className={INPUT} value={draft.name} onChange={(event) => set('name')(event.target.value)} placeholder="Riñoneras" />
        </Field>
        <Field label="Descripción" hint="Una frase corta para la tarjeta del inicio.">
          <textarea className={`${INPUT} min-h-20 resize-y`} value={draft.text} onChange={(event) => set('text')(event.target.value)} />
        </Field>
        <div>
          <p className="text-sm font-semibold">Foto de la línea</p>
          <p className="mt-0.5 mb-2 text-sm text-ash">Opcional. Reemplaza al dibujo en la tarjeta del inicio.</p>
          <PhotoPicker photos={draft.photo ? [draft.photo] : []} setPhotos={setPhotos} name={draft.name} multiple={false} onUploadingChange={setUploading} />
        </div>
        {productCount > 0 && (
          <p className="rounded-xl border border-line p-3.5 text-sm text-ash">
            Tiene {productCount} {productCount === 1 ? 'producto' : 'productos'}. Para borrar la línea, primero mové o borrá sus productos.
          </p>
        )}
      </form>
    </Drawer>
  )
}

function Row({ thumb, title, subtitle, badges, actions, onEdit }) {
  return (
    <li className="flex items-center gap-3 px-3 py-3 sm:px-4">
      {thumb}
      <button type="button" className="min-w-0 flex-1 text-left" onClick={onEdit}>
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-semibold hover:underline">{title}</span>
          {badges}
        </span>
        <span className="mt-0.5 block truncate text-sm text-ash">{subtitle}</span>
      </button>
      {actions}
      <button type="button" aria-label={`Editar ${title}`} className={ICON_BUTTON} onClick={onEdit}>
        <Pencil className="size-4" />
      </button>
    </li>
  )
}

function ProductsTab({ catalog, onEdit, onNew, onReorder }) {
  const [lineFilter, setLineFilter] = useState('')
  const [query, setQuery] = useState('')
  const lineBySlug = useMemo(() => Object.fromEntries(catalog.lines.map((line) => [line.slug, line])), [catalog.lines])
  const shown = catalog.products.filter((product) => (!lineFilter || product.line === lineFilter) && (!query.trim() || matches(`${product.name} ${product.text}`, query)))

  const move = (product, step) => {
    const i = shown.indexOf(product)
    const a = catalog.products.indexOf(product)
    const b = catalog.products.indexOf(shown[i + step])
    onReorder(swap(catalog.products, a, b))
  }

  if (catalog.lines.length === 0) return <p className="py-16 text-center text-ash">Primero creá una línea en la pestaña Líneas.</p>

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <label className="relative min-w-52 flex-1">
          <span className="sr-only">Buscar productos</span>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ash" />
          <input className={`${INPUT} pl-10`} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar…" />
        </label>
        <label className="min-w-44">
          <span className="sr-only">Filtrar por línea</span>
          <select className={INPUT} value={lineFilter} onChange={(event) => setLineFilter(event.target.value)}>
            <option value="">Todas las líneas</option>
            {catalog.lines.map(({ slug, name }) => (
              <option key={slug} value={slug}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className={PRIMARY} onClick={() => onNew(lineFilter)}>
          <Plus className="size-4" /> Nuevo producto
        </button>
      </div>

      {shown.length === 0 ? (
        <p className="py-16 text-center text-ash">{query ? 'No hay productos que coincidan con la búsqueda.' : 'Esta línea todavía no tiene productos.'}</p>
      ) : (
        <ul className="mt-5 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-coal">
          {shown.map((product, i) => (
            <Row
              key={product.id}
              thumb={<Thumb photo={product.photos[0]} art={lineBySlug[product.line]?.art} />}
              title={product.name}
              subtitle={`${lineBySlug[product.line]?.name} · ${formatPrice(product.price)}${product.photos.length ? ` · ${product.photos.length} ${product.photos.length === 1 ? 'foto' : 'fotos'}` : ''}`}
              badges={
                <>
                  {product.hidden && <Badge>Oculto</Badge>}
                  {product.soldOut && <Badge tone="sun">Sin stock</Badge>}
                </>
              }
              actions={<MoveButtons name={product.name} index={i} total={shown.length} onMove={(step) => move(product, step)} />}
              onEdit={() => onEdit(product)}
            />
          ))}
        </ul>
      )}
    </>
  )
}

function LinesTab({ catalog, onEdit, onNew, onReorder }) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ash">El orden de acá es el orden del inicio, de los filtros y de la cinta animada.</p>
        <button type="button" className={PRIMARY} onClick={onNew}>
          <Plus className="size-4" /> Nueva línea
        </button>
      </div>
      <ul className="mt-5 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-coal">
        {catalog.lines.map((line, i) => {
          const count = catalog.products.filter((product) => product.line === line.slug).length
          return (
            <Row
              key={line.slug}
              thumb={<Thumb photo={line.photo} art={line.art} />}
              title={line.name}
              subtitle={`${count} ${count === 1 ? 'producto' : 'productos'} · ${line.text}`}
              actions={<MoveButtons name={line.name} index={i} total={catalog.lines.length} onMove={(step) => onReorder(swap(catalog.lines, i, i + step))} />}
              onEdit={() => onEdit(line)}
            />
          )
        })}
      </ul>
    </>
  )
}

// Pantalla de login delante del panel. La API rechaza todo pedido sin sesión, esto solo decide qué mostrar.
export default function Admin() {
  const [session, setSession] = useState({ state: 'checking' })

  useEffect(() => {
    refresh()
    const onExpired = () => refresh({ notice: 'Tu sesión se cerró. Volvé a entrar para seguir.' })
    window.addEventListener(SESSION_EXPIRED, onExpired)
    return () => window.removeEventListener(SESSION_EXPIRED, onExpired)
  }, [])

  // Vuelve a preguntar al servidor: así se sabe con qué usuario se entró y si sigue la cuenta de prueba.
  const refresh = (extra = {}) =>
    getSession().then(
      ({ authenticated, user, demo }) => setSession({ state: authenticated ? 'in' : 'out', user, demo, ...extra }),
      (error) => setSession({ state: 'error', message: error.message }),
    )

  async function exit() {
    await logout().catch(() => {})
    refresh()
  }

  if (session.state === 'in') return <Panel user={session.user} onLogout={exit} />
  if (session.state === 'out') return <Login notice={session.notice} demo={session.demo} onLogin={() => refresh()} />
  return (
    <main className="grid min-h-dvh place-items-center px-4 text-center">
      {session.state === 'error' ? (
        <div>
          <CircleAlert className="mx-auto size-10 text-sun-2" />
          <p className="mt-4 font-semibold">No se pudo abrir el panel.</p>
          <p className="mt-1 text-ash">{session.message}</p>
        </div>
      ) : (
        <LoaderCircle className="size-8 animate-spin text-ash" aria-label="Cargando" />
      )}
    </main>
  )
}

function Panel({ user, onLogout }) {
  const [catalog, setCatalog] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [status, setStatus] = useState(null)
  const [tab, setTab] = useState('products')
  const [editing, setEditing] = useState(null)
  const queue = useRef(Promise.resolve())

  useEffect(() => {
    document.title = 'Panel · Conejo'
    loadCatalog().then(setCatalog, (error) => setLoadError(error.message))
  }, [])

  useEffect(() => {
    if (status?.type !== 'ok') return
    const timer = setTimeout(() => setStatus(null), 3500)
    return () => clearTimeout(timer)
  }, [status])

  // Muestra el cambio al instante y lo guarda en orden. Si falla, vuelve a lo que hay en el archivo.
  function commit(next, message) {
    setCatalog(next)
    const run = queue.current.then(
      () =>
        saveCatalog(next).then(
          () => {
            setStatus({ type: 'ok', text: message })
            return true
          },
          async (error) => {
            setStatus({ type: 'error', text: error.message })
            setCatalog(await loadCatalog().catch(() => next))
            return false
          },
        ),
    )
    queue.current = run
    return run
  }

  function saveProduct(saved, isNew) {
    let products = catalog.products.map((product) => (product.id === saved.id ? saved : product))
    if (isNew) {
      const last = catalog.products.findLastIndex((product) => product.line === saved.line)
      products = [...catalog.products]
      products.splice(last === -1 ? products.length : last + 1, 0, saved)
    }
    return commit({ ...catalog, products }, isNew ? `Agregaste "${saved.name}".` : `Guardaste "${saved.name}".`)
  }

  function deleteProduct(product) {
    if (!window.confirm(`¿Borrar "${product.name}"? Se borran también sus fotos. No se puede deshacer.`)) return
    setEditing(null)
    commit({ ...catalog, products: catalog.products.filter(({ id }) => id !== product.id) }, `Borraste "${product.name}".`)
  }

  function saveLine(saved, isNew) {
    const lines = isNew ? [...catalog.lines, saved] : catalog.lines.map((line) => (line.slug === saved.slug ? saved : line))
    return commit({ ...catalog, lines }, isNew ? `Agregaste la línea "${saved.name}".` : `Guardaste la línea "${saved.name}".`)
  }

  function deleteLine(line) {
    if (!window.confirm(`¿Borrar la línea "${line.name}"? No se puede deshacer.`)) return
    setEditing(null)
    commit({ ...catalog, lines: catalog.lines.filter(({ slug }) => slug !== line.slug) }, `Borraste la línea "${line.name}".`)
  }

  if (!catalog) {
    return (
      <main className="grid min-h-dvh place-items-center px-4 text-center">
        {loadError ? (
          <div>
            <CircleAlert className="mx-auto size-10 text-sun-2" />
            <p className="mt-4 font-semibold">No se pudo abrir el catálogo.</p>
            <p className="mt-1 text-ash">{loadError}</p>
          </div>
        ) : (
          <LoaderCircle className="size-8 animate-spin text-ash" aria-label="Cargando" />
        )}
      </main>
    )
  }

  const tabs = [
    { id: 'products', label: 'Productos', count: catalog.products.length },
    { id: 'lines', label: 'Líneas', count: catalog.lines.length },
  ]

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line bg-ink/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-8">
          <div>
            <h1 className="font-brush text-3xl leading-none">Panel</h1>
            <p className="mt-1 text-xs text-ash">Solo en tu compu. Los cambios se guardan en src/catalog.json; para publicarlos, hacé push.</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <a href="/#/productos" target="_blank" rel="noreferrer" className={SECONDARY}>
              Ver la web <ExternalLink className="size-4" />
            </a>
            <button type="button" className={SECONDARY} onClick={onLogout} title={user ? `Entraste como ${user}` : undefined}>
              Salir{user && <span className="hidden font-normal text-ash sm:inline">({user})</span>} <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        <nav aria-label="Secciones del panel" className="mb-6 flex gap-2">
          {tabs.map(({ id, label, count }) => (
            <button
              key={id}
              type="button"
              aria-current={tab === id ? 'page' : undefined}
              className={`relative rounded-full border px-4 py-2 text-sm transition-colors ${tab === id ? 'border-bone font-semibold text-ink' : 'border-line text-ash hover:border-ash hover:text-bone'}`}
              onClick={() => setTab(id)}
            >
              {tab === id && <motion.span layoutId="admin-tab" className="absolute inset-0 rounded-full bg-bone" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />}
              <span className="relative">
                {label} <span className="tabular-nums opacity-60">{count}</span>
              </span>
            </button>
          ))}
        </nav>

        {tab === 'products' ? (
          <ProductsTab
            catalog={catalog}
            onEdit={(product) => setEditing({ kind: 'product', item: product })}
            onNew={(line) => setEditing({ kind: 'product', item: null, line })}
            onReorder={(products) => commit({ ...catalog, products }, 'Orden guardado.')}
          />
        ) : (
          <LinesTab
            catalog={catalog}
            onEdit={(line) => setEditing({ kind: 'line', item: line })}
            onNew={() => setEditing({ kind: 'line', item: null })}
            onReorder={(lines) => commit({ ...catalog, lines }, 'Orden guardado.')}
          />
        )}
      </main>

      {editing?.kind === 'product' && (
        <ProductEditor
          product={editing.item}
          catalog={catalog}
          defaultLine={editing.line}
          onSave={saveProduct}
          onDelete={deleteProduct}
          onClose={() => setEditing(null)}
        />
      )}
      {editing?.kind === 'line' && <LineEditor line={editing.item} catalog={catalog} onSave={saveLine} onDelete={deleteLine} onClose={() => setEditing(null)} />}

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-4">
        <AnimatePresence>
          {status && (
            <motion.p
              key={status.text}
              role={status.type === 'error' ? 'alert' : undefined}
              className={`pointer-events-auto flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-lg ${status.type === 'ok' ? 'bg-bone text-ink' : 'bg-sun-2 text-bone'}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              onClick={() => setStatus(null)}
            >
              {status.type === 'ok' ? <Check className="size-4" /> : <CircleAlert className="size-4" />}
              {status.text}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
