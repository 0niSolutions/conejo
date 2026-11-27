import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowDown, ArrowUp, Check, CircleAlert, ExternalLink, LoaderCircle, LogOut, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { formatPrice } from '../data'
import { LOCAL, LOGOUT_URL, SESSION_EXPIRED, getSession, loadCatalog, matches, parsePrice, photoFallback, photoSrc, saveCatalog, uniqueSlug } from './api'
import { Badge, Drawer, Field, ICON_BUTTON, INPUT, PRIMARY, PhotoPicker, SECONDARY, Thumb, Toggle, VideoPicker } from './parts'

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

// Elige la foto del carrete entre las del producto, o una propia subida aparte.
function FeaturedPhotoChooser({ photos, extra, selected, onSelect, setExtra, name, onUploadingChange, error }) {
  const setExtraPhotos = useMemo(() => (update) => setExtra((current) => update(current ? [current] : [])[0] ?? null), [setExtra])
  return (
    <div className="rounded-xl border border-line p-3.5">
      <p className="text-sm font-semibold">Foto para el carrete</p>
      <p className="mt-0.5 mb-3 text-sm text-ash">Se ve sola, sin precio ni descripción. Al tocarla se abre este producto.</p>
      {(photos.length > 0 || extra) && (
        <ul className="mb-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
          {[...photos, ...(extra ? [extra] : [])].map((photo, i) => (
            <li key={photo}>
              <button
                type="button"
                aria-label={photo === extra ? 'Usar la foto subida aparte en el carrete' : `Usar la foto ${i + 1} en el carrete`}
                aria-pressed={selected === photo}
                className={`relative block aspect-square w-full overflow-hidden rounded-lg border-2 transition ${selected === photo ? 'border-sun-1' : 'border-transparent opacity-60 hover:opacity-100'}`}
                onClick={() => onSelect(photo)}
              >
                <img src={photoSrc(photo)} onError={(event) => photoFallback(event, photo)} alt="" className="size-full object-cover" />
                {photo === extra && <span className="absolute inset-x-0 bottom-0 bg-ink/70 py-0.5 text-center text-[10px] font-semibold">Aparte</span>}
                {selected === photo && (
                  <span className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-sun-1 text-ink">
                    <Check className="size-3" />
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {!extra && (
        <p className="mb-2 text-sm text-ash">{photos.length > 0 ? 'O subí una foto distinta solo para el carrete:' : 'Subí la foto que se va a ver en el carrete:'}</p>
      )}
      {!extra && <PhotoPicker photos={[]} setPhotos={setExtraPhotos} name={`${name || 'producto'} destacado`} multiple={false} onUploadingChange={onUploadingChange} />}
      {extra && (
        <button type="button" className="text-sm text-ash underline hover:text-bone" onClick={() => setExtra(null)}>
          Quitar la foto subida aparte
        </button>
      )}
      {error && <p className="mt-2 text-sm text-sun-2">{error}</p>}
    </div>
  )
}

function ProductEditor({ product, catalog, defaultLine, onSave, onDelete, onClose }) {
  const entry = product ? catalog.featured.find((item) => item.product === product.id) : null
  const { draft, setDraft, set, dirty } = useDraft(
    product
      ? {
          ...product,
          price: String(product.price),
          featured: Boolean(entry),
          featuredPhoto: entry?.photo ?? null,
          // Foto del carrete que no es una de las del producto.
          featuredExtra: entry && !product.photos.includes(entry.photo) ? entry.photo : null,
        }
      : {
          name: '',
          line: defaultLine || catalog.lines[0].slug,
          text: '',
          price: '',
          photos: [],
          hidden: false,
          soldOut: false,
          featured: false,
          featuredPhoto: null,
          featuredExtra: null,
        },
  )
  const [featuredUploading, setFeaturedUploading] = useState(false)
  const setFeaturedExtra = useMemo(
    () => (update) =>
      setDraft((current) => {
        const featuredExtra = typeof update === 'function' ? update(current.featuredExtra) : update
        return { ...current, featuredExtra, featuredPhoto: featuredExtra ?? (current.featuredPhoto === current.featuredExtra ? null : current.featuredPhoto) }
      }),
    [setDraft],
  )
  // Si la foto elegida se quitó del producto, se usa la principal.
  const featuredOptions = [...draft.photos, ...(draft.featuredExtra ? [draft.featuredExtra] : [])]
  const featuredPhoto = featuredOptions.includes(draft.featuredPhoto) ? draft.featuredPhoto : (featuredOptions[0] ?? null)
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
    if (draft.featured && !featuredPhoto) found.featured = 'Para destacarlo, subí una foto.'
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
    const ok = await onSave(saved, !product, draft.featured ? featuredPhoto : null)
    setSaving(false)
    if (ok) onClose()
  }

  return (
    <Drawer
      title={product ? `Editar ${product.name}` : 'Nuevo producto'}
      onClose={close}
      footer={
        <>
          <button type="submit" form="product-form" className={PRIMARY} disabled={saving || uploading || featuredUploading}>
            {saving ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
            {uploading || featuredUploading ? 'Esperando las fotos…' : product ? 'Guardar cambios' : 'Agregar producto'}
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
          <Toggle label="Destacado" hint="Una foto suya aparece en el carrete del inicio." checked={draft.featured} onChange={set('featured')} />
          {draft.featured && (
            <FeaturedPhotoChooser
              photos={draft.photos}
              extra={draft.featuredExtra}
              selected={featuredPhoto}
              onSelect={set('featuredPhoto')}
              setExtra={setFeaturedExtra}
              name={draft.name}
              onUploadingChange={setFeaturedUploading}
              error={errors.featured}
            />
          )}
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

// Texto de "Sobre mí" para los catálogos guardados antes de que se pudiera editar.
const DEFAULT_BIO =
  'Hago marroquinería artesanal desde Salta Capital. Riñoneras, mochilas, bolsos, fundas de guitarra, materos y más: cada pieza está hecha a mano, una por una. Si buscás el tuyo, escribime, atiendo todos los días.'

// Completa lo que falte en catálogos guardados con versiones anteriores del panel. Los destacados
// viejos eran solo ids de producto: pasan a ser la primera foto del producto (los que no tienen foto se quitan).
function normalize(data) {
  const byId = Object.fromEntries(data.products.map((product) => [product.id, product]))
  const featured = (Array.isArray(data.featured) ? data.featured : [])
    .map((item) => (typeof item === 'string' ? { photo: byId[item]?.photos[0], product: item } : item))
    .filter((item, i, list) => item?.photo && byId[item.product] && list.findIndex((other) => other?.photo === item.photo) === i)
  const site = { bio: DEFAULT_BIO, video: null, poster: null, ...data.site }
  return { ...data, featured, site }
}

// Desplegable de productos agrupados por línea.
function ProductSelect({ catalog, value, onChange, placeholder, taken = new Set() }) {
  return (
    <select className={INPUT} value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">{placeholder}</option>
      {catalog.lines.map((line) => {
        const options = catalog.products.filter((product) => product.line === line.slug)
        if (options.length === 0) return null
        return (
          <optgroup key={line.slug} label={line.name}>
            {options.map((product) => (
              <option key={product.id} value={product.id} disabled={taken.has(product.id)}>
                {product.name}
                {product.hidden ? ' (oculto)' : ''}
                {taken.has(product.id) ? ' (ya destacado)' : ''}
              </option>
            ))}
          </optgroup>
        )
      })}
    </select>
  )
}

function FeaturedEditor({ item, catalog, onSave, onDelete, onClose }) {
  const { draft, setDraft, set, dirty } = useDraft(item ? { ...item } : { photo: null, product: '' })
  const [errors, setErrors] = useState({})
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const setPhotos = useMemo(() => (update) => setDraft((current) => ({ ...current, photo: update(current.photo ? [current.photo] : [])[0] ?? null })), [setDraft])
  const product = catalog.products.find(({ id }) => id === draft.product)
  const close = () => confirmDiscard(dirty) && onClose()

  async function submit(event) {
    event.preventDefault()
    const found = {}
    if (!draft.photo) found.photo = 'Subí una foto.'
    if (!product) found.product = 'Elegí qué producto se abre al tocar la foto.'
    setErrors(found)
    if (Object.keys(found).length > 0) return
    setSaving(true)
    const ok = await onSave({ photo: draft.photo, product: draft.product }, item)
    setSaving(false)
    if (ok) onClose()
  }

  return (
    <Drawer
      title={item ? 'Editar destacado' : 'Nuevo destacado'}
      onClose={close}
      footer={
        <>
          <button type="submit" form="featured-form" className={PRIMARY} disabled={saving || uploading}>
            {saving ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
            {uploading ? 'Esperando la foto…' : item ? 'Guardar cambios' : 'Agregar destacado'}
          </button>
          <button type="button" className={SECONDARY} onClick={close}>
            Cancelar
          </button>
          {item && (
            <button type="button" className={`${SECONDARY} ml-auto hover:border-sun-2 hover:text-sun-2`} onClick={() => onDelete(item)}>
              <Trash2 className="size-4" /> Quitar
            </button>
          )}
        </>
      }
    >
      <form id="featured-form" className="space-y-5" onSubmit={submit} noValidate>
        <div>
          <p className="text-sm font-semibold">Foto</p>
          <p className="mt-0.5 mb-2 text-sm text-ash">Se ve sola en el carrete, sin nombre ni precio.</p>
          <PhotoPicker photos={draft.photo ? [draft.photo] : []} setPhotos={setPhotos} name={product?.name ?? 'destacado'} multiple={false} onUploadingChange={setUploading} />
          {errors.photo && <p className="mt-2 text-sm text-sun-2">{errors.photo}</p>}
        </div>
        <Field label="Producto que se abre al tocarla" error={errors.product} hint={product ? `${formatPrice(product.price)}${product.hidden ? ' · está oculto: la foto no se va a ver en la web' : ''}` : 'Al tocar la foto se abre la ficha de este producto.'}>
          <ProductSelect
            catalog={catalog}
            value={draft.product}
            onChange={set('product')}
            placeholder="Elegí un producto…"
            taken={new Set(catalog.featured.filter((other) => other !== item).map((other) => other.product))}
          />
        </Field>
      </form>
    </Drawer>
  )
}

function FeaturedTab({ catalog, onEdit, onNew, onChange }) {
  const byId = useMemo(() => Object.fromEntries(catalog.products.map((product) => [product.id, product])), [catalog.products])
  const items = catalog.featured

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-ash">
          Fotos del carrete del inicio, abajo de “Sobre mí”, en este orden. Se ven solas, sin precio ni descripción; al tocarlas se abre el producto que elijas.
        </p>
        <button type="button" className={PRIMARY} onClick={onNew} disabled={catalog.products.length === 0}>
          <Plus className="size-4" /> Nuevo destacado
        </button>
      </div>

      {items.length === 0 ? (
        <p className="py-16 text-center text-ash">Todavía no hay destacados. Si no hay ninguno, el carrete no se muestra.</p>
      ) : (
        <ul className="mt-5 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-coal">
          {items.map((item, i) => {
            const product = byId[item.product]
            return (
              <Row
                key={item.photo}
                thumb={<Thumb photo={item.photo} />}
                title={product?.name ?? 'Producto borrado'}
                subtitle={`Al tocarla abre: ${product?.name ?? '—'}`}
                badges={product?.hidden && <Badge>Producto oculto: no se ve en la web</Badge>}
                actions={
                  <>
                    <MoveButtons name={`destacado ${i + 1}`} index={i} total={items.length} onMove={(step) => onChange(swap(items, i, i + step), 'Orden guardado.')} />
                    <button
                      type="button"
                      aria-label={`Quitar destacado ${i + 1}`}
                      title="Quitar de destacados"
                      className={ICON_BUTTON}
                      onClick={() => window.confirm('¿Quitar esta foto de destacados?') && onChange(items.filter((other) => other !== item), 'Quitaste el destacado.')}
                    >
                      <X className="size-4" />
                    </button>
                  </>
                }
                onEdit={() => onEdit(item)}
              />
            )
          })}
        </ul>
      )}
    </>
  )
}

function AboutTab({ catalog, onSave, onDirtyChange }) {
  const initial = catalog.site
  const [draft, setDraft] = useState(initial)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial)
  const set = (field) => (value) => setDraft((current) => ({ ...current, [field]: value }))
  const setPoster = useMemo(() => (update) => setDraft((current) => ({ ...current, poster: update(current.poster ? [current.poster] : [])[0] ?? null })), [])

  useEffect(() => {
    onDirtyChange(dirty)
  }, [dirty, onDirtyChange])

  // Avisa antes de cerrar la pestaña con cambios sin guardar.
  useEffect(() => {
    if (!dirty) return
    const warn = (event) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  async function submit(event) {
    event.preventDefault()
    if (!draft.bio.trim()) return setError('La biografía no puede quedar vacía.')
    setError(null)
    setSaving(true)
    await onSave({ ...draft, bio: draft.bio.trim() })
    setSaving(false)
  }

  return (
    <form className="space-y-6" onSubmit={submit} noValidate>
      <p className="text-sm text-ash">El texto y el video de la sección “Sobre mí” del inicio.</p>

      <Field label="Biografía" error={error} hint={`${draft.bio.trim().split(/\s+/).filter(Boolean).length} palabras. Se va iluminando palabra por palabra al bajar.`}>
        <textarea className={`${INPUT} min-h-40 resize-y text-base leading-relaxed`} value={draft.bio} onChange={(event) => set('bio')(event.target.value)} />
      </Field>

      <div className="grid gap-6 sm:grid-cols-[1fr_14rem]">
        <div>
          <p className="text-sm font-semibold">Video</p>
          <p className="mt-0.5 mb-2 text-sm text-ash">Sin video propio se muestra el original.</p>
          <VideoPicker video={draft.video} poster={draft.poster} setVideo={set('video')} name="sobre-mi" onUploadingChange={setUploading} />
        </div>
        <div>
          <p className="text-sm font-semibold">Portada del video</p>
          <p className="mt-0.5 mb-2 text-sm text-ash">Opcional. Se ve mientras carga.</p>
          <PhotoPicker photos={draft.poster ? [draft.poster] : []} setPhotos={setPoster} name="portada-video" multiple={false} onUploadingChange={setUploading} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
        <button type="submit" className={PRIMARY} disabled={!dirty || saving || uploading}>
          {saving ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
          {uploading ? 'Esperando el archivo…' : 'Guardar cambios'}
        </button>
        {dirty && (
          <button type="button" className={SECONDARY} onClick={() => setDraft(initial)}>
            Descartar
          </button>
        )}
      </div>
    </form>
  )
}

// El login lo hace Cloudflare Access antes de que cargue esta página: pide el mail y manda un código.
// Acá solo se pregunta con qué mail se entró. La API igual rechaza todo pedido sin una sesión válida.
export default function Admin() {
  const [session, setSession] = useState({ state: 'checking' })

  useEffect(() => {
    getSession().then(
      ({ user }) => setSession({ state: 'in', user }),
      (error) => setSession({ state: 'error', message: error.message }),
    )
    const onExpired = () => setSession({ state: 'expired' })
    window.addEventListener(SESSION_EXPIRED, onExpired)
    return () => window.removeEventListener(SESSION_EXPIRED, onExpired)
  }, [])

  if (session.state === 'in') return <Panel user={session.user} />
  return (
    <main className="grid min-h-dvh place-items-center px-4 text-center">
      {session.state === 'checking' ? (
        <LoaderCircle className="size-8 animate-spin text-ash" aria-label="Cargando" />
      ) : (
        <div>
          <CircleAlert className="mx-auto size-10 text-sun-2" />
          <p className="mt-4 font-semibold">{session.state === 'expired' ? 'Tu sesión venció.' : 'No se pudo abrir el panel.'}</p>
          <p className="mt-1 text-ash">{session.state === 'expired' ? 'Volvé a entrar con tu mail para seguir.' : session.message}</p>
          <button type="button" className={`${PRIMARY} mt-6`} onClick={() => window.location.reload()}>
            Volver a entrar
          </button>
        </div>
      )}
    </main>
  )
}

const FAILED = Symbol('guardado fallido')

function Panel({ user }) {
  const [catalog, setCatalog] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [status, setStatus] = useState(null)
  const [tab, setTab] = useState('products')
  const [editing, setEditing] = useState(null)
  const queue = useRef(Promise.resolve())
  const latest = useRef(null)
  const aboutDirty = useRef(false)
  const setAboutDirty = useCallback((value) => (aboutDirty.current = value), [])

  useEffect(() => {
    document.title = 'Panel · CONEJO.08'
    loadCatalog().then((data) => setCatalog(normalize(data)), (error) => setLoadError(error.message))
  }, [])

  useEffect(() => {
    if (status?.type !== 'ok') return
    const timer = setTimeout(() => setStatus(null), 3500)
    return () => clearTimeout(timer)
  }, [status])

  // Muestra el cambio al instante y lo guarda en orden. Si falla, vuelve a lo último guardado.
  // Si se hacen varios cambios seguidos mientras se guarda (por ejemplo, reordenar), se guarda solo
  // el último estado, que ya los incluye a todos: un solo commit y un solo deploy en vez de varios.
  // Si un guardado falla, los cambios que quedaron en la fila se descartan (ya incluían el que falló):
  // así, si falló porque otra persona guardó en el medio, no se pisa lo suyo con el guardado siguiente.
  function commit(next, message) {
    setCatalog(next)
    latest.current = next
    const run = queue.current.then(() =>
      latest.current === FAILED
        ? false
        : latest.current !== next
        ? true
        : saveCatalog(next).then(
          ({ changed }) => {
            setStatus({ type: 'ok', text: !LOCAL && changed ? `${message} La web se actualiza en 1 o 2 minutos.` : message })
            return true
          },
          async (error) => {
            latest.current = FAILED
            setStatus({ type: 'error', text: error.message })
            setCatalog(normalize(await loadCatalog().catch(() => next)))
            return false
          },
        ),
    )
    queue.current = run
    return run
  }

  function saveProduct(saved, isNew, featuredPhoto) {
    let products = catalog.products.map((product) => (product.id === saved.id ? saved : product))
    if (isNew) {
      const last = catalog.products.findLastIndex((product) => product.line === saved.line)
      products = [...catalog.products]
      products.splice(last === -1 ? products.length : last + 1, 0, saved)
    }
    // Una sola foto en el carrete por producto: si ya estaba, conserva su lugar; si no, va al final.
    const position = catalog.featured.findIndex((item) => item.product === saved.id)
    const featured = catalog.featured.filter((item) => item.product !== saved.id)
    if (featuredPhoto) featured.splice(position === -1 ? featured.length : position, 0, { photo: featuredPhoto, product: saved.id })
    return commit({ ...catalog, products, featured }, isNew ? `Agregaste "${saved.name}".` : `Guardaste "${saved.name}".`)
  }

  function deleteProduct(product) {
    const inFeatured = catalog.featured.filter((item) => item.product === product.id).length
    const extra = inFeatured ? ` También se quita${inFeatured === 1 ? ' su foto' : `n sus ${inFeatured} fotos`} de destacados.` : ''
    if (!window.confirm(`¿Borrar "${product.name}"? Se borran también sus fotos.${extra} No se puede deshacer.`)) return
    setEditing(null)
    commit(
      { ...catalog, products: catalog.products.filter(({ id }) => id !== product.id), featured: catalog.featured.filter((item) => item.product !== product.id) },
      `Borraste "${product.name}".`,
    )
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

  function saveFeatured(saved, previous) {
    const featured = previous ? catalog.featured.map((item) => (item === previous ? saved : item)) : [...catalog.featured, saved]
    return commit({ ...catalog, featured }, previous ? 'Guardaste el destacado.' : 'Agregaste un destacado.')
  }

  function deleteFeatured(item) {
    if (!window.confirm('¿Quitar esta foto de destacados?')) return
    setEditing(null)
    commit({ ...catalog, featured: catalog.featured.filter((other) => other !== item) }, 'Quitaste el destacado.')
  }

  const saveSite = (site) => commit({ ...catalog, site }, 'Guardaste “Sobre mí”.')
  const confirmAboutLeave = () => {
    if (!confirmDiscard(aboutDirty.current)) return false
    aboutDirty.current = false
    return true
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
    { id: 'featured', label: 'Destacados', count: catalog.featured.length },
    { id: 'about', label: 'Sobre mí' },
  ]

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line bg-ink/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-8">
          <div>
            <h1 className="font-brush text-3xl leading-none">Panel</h1>
            <p className="mt-1 text-xs text-ash">
              {LOCAL
                ? 'Modo local: los cambios se guardan en src/catalog.json; para publicarlos, hacé push.'
                : 'Cada cambio se publica solo en la web en 1 o 2 minutos.'}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <a href="/productos" target="_blank" rel="noreferrer" className={SECONDARY}>
              Ver la web <ExternalLink className="size-4" />
            </a>
            {!LOCAL && (
              <a href={LOGOUT_URL} className={SECONDARY} title={user ? `Entraste como ${user}` : undefined}>
                Salir <LogOut className="size-4" />
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        <nav aria-label="Secciones del panel" className="mb-6 flex flex-wrap gap-2">
          {tabs.map(({ id, label, count }) => (
            <button
              key={id}
              type="button"
              aria-current={tab === id ? 'page' : undefined}
              className={`relative rounded-full border px-4 py-2 text-sm transition-colors ${tab === id ? 'border-bone font-semibold text-ink' : 'border-line text-ash hover:border-ash hover:text-bone'}`}
              onClick={() => (tab !== 'about' || id === 'about' || confirmAboutLeave()) && setTab(id)}
            >
              {tab === id && <motion.span layoutId="admin-tab" className="absolute inset-0 rounded-full bg-bone" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />}
              <span className="relative">
                {label} {count !== undefined && <span className="tabular-nums opacity-60">{count}</span>}
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
        ) : tab === 'featured' ? (
          <FeaturedTab
            catalog={catalog}
            onEdit={(item) => setEditing({ kind: 'featured', item })}
            onNew={() => setEditing({ kind: 'featured', item: null })}
            onChange={(featured, message) => commit({ ...catalog, featured }, message)}
          />
        ) : tab === 'about' ? (
          <AboutTab key={JSON.stringify(catalog.site)} catalog={catalog} onSave={saveSite} onDirtyChange={setAboutDirty} />
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
      {editing?.kind === 'featured' && (
        <FeaturedEditor item={editing.item} catalog={catalog} onSave={saveFeatured} onDelete={deleteFeatured} onClose={() => setEditing(null)} />
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
