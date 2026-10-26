/** "0xA91F…E82C" */
export const shortAddress = (address: string) => (address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address)

/** "29 Jul, 2026", as in the order confirmation frame. */
export function formatShortDate(iso: string) {
  const date = new Date(iso)
  const month = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
  return `${date.getDate()} ${month.charAt(0).toUpperCase()}${month.slice(1)}, ${date.getFullYear()}`
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}
