import type { CartItem, QuoteLine } from '@/shared/contracts/commerce'
import { formatEth } from '@/shared/lib/money'

/** Human message for a line whose price or availability changed since it was added. */
export function lineNotice(item: Pick<CartItem, 'name' | 'quantity' | 'available'>, line: QuoteLine | undefined): string | null {
  if (item.available === 0) return `${item.name} esgotou. Remova o item para continuar.`
  if (item.quantity > item.available) return `Restam apenas ${item.available} unidades de ${item.name}. Ajuste a quantidade.`
  if (line?.status === 'price_changed' && line.previousUnitPrice) {
    return `O preço de ${item.name} mudou de ${formatEth(line.previousUnitPrice)} para ${formatEth(line.unitPrice)}.`
  }
  return null
}
