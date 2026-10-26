import type { Quote } from '@/shared/contracts/commerce'
import { eth, formatEth } from '@/shared/lib/money'

/** Lines whose price, quantity or stock differ between the quote under review and the current one. */
export function quoteChanges(reviewed: Quote, current: Quote): string[] {
  const changes: string[] = []
  for (const line of current.lines) {
    const before = reviewed.lines.find((l) => l.itemId === line.itemId)
    if (!before) {
      changes.push(`${line.name} foi adicionado ao pedido.`)
      continue
    }
    if (!eth.eq(before.unitPrice, line.unitPrice)) {
      changes.push(`${line.name}: preço de ${formatEth(before.unitPrice)} para ${formatEth(line.unitPrice)}.`)
    }
    if (line.status === 'sold_out') changes.push(`${line.name}: a edição ${line.editionLabel} esgotou.`)
    else if (line.status === 'insufficient') changes.push(`${line.name}: restam apenas ${line.available} unidades.`)
  }
  for (const line of reviewed.lines) {
    if (!current.lines.some((l) => l.itemId === line.itemId)) changes.push(`${line.name} saiu do pedido.`)
  }
  if (!eth.eq(reviewed.total, current.total)) {
    changes.push(`Total de ${formatEth(reviewed.total)} para ${formatEth(current.total)}.`)
  }
  return changes
}
