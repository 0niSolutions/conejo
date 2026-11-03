import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { CATALOG, WHATSAPP_URL, formatPrice } from './data'

const STORAGE_KEY = 'conejo-carrito'

const CartContext = createContext(null)

function loadQuantities() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {}
  } catch {
    return {}
  }
}

function orderUrl(lines, total) {
  const items = lines.map(
    ({ product, quantity }) => `• ${quantity} x ${product.name} (${formatPrice(product.price)} c/u): ${formatPrice(product.price * quantity)}`,
  )
  const message = ['¡Hola! Quiero hacer este pedido:', '', ...items, '', `Total: ${formatPrice(total)}`].join('\n')
  return `${WHATSAPP_URL}?text=${encodeURIComponent(message)}`
}

export function CartProvider({ children }) {
  const [quantities, setQuantities] = useState(loadQuantities)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(quantities))
    } catch {
      // Sin almacenamiento el carrito sigue andando hasta recargar la página.
    }
  }, [quantities])

  const setQuantity = useCallback((id, quantity) => {
    setQuantities((current) => {
      const next = { ...current }
      if (quantity > 0) next[id] = quantity
      else delete next[id]
      return next
    })
  }, [])

  const clear = useCallback(() => setQuantities({}), [])

  const value = useMemo(() => {
    // Lo guardado puede nombrar productos que ya no están en el catálogo: esos se ignoran.
    const lines = Object.entries(quantities).flatMap(([id, quantity]) => {
      const product = CATALOG.find((item) => item.id === id)
      return product ? [{ product, quantity }] : []
    })
    const count = lines.reduce((sum, line) => sum + line.quantity, 0)
    const total = lines.reduce((sum, line) => sum + line.quantity * line.product.price, 0)
    return { lines, count, total, quantities, setQuantity, clear, open, setOpen, whatsappUrl: orderUrl(lines, total) }
  }, [quantities, setQuantity, clear, open])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  return useContext(CartContext)
}
