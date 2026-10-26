import Big from 'big.js'
import { z } from 'zod'

/** ETH amounts travel as decimal strings to keep full precision end to end. */
export const ethAmountSchema = z.string().regex(/^\d+(\.\d{1,18})?$/, 'Valor em ETH inválido')
export type EthAmount = z.infer<typeof ethAmountSchema>

const MIN_DISPLAY_DECIMALS = 2
const MAX_DISPLAY_DECIMALS = 6

export const eth = {
  add: (a: EthAmount, b: EthAmount): EthAmount => Big(a).plus(b).toString(),
  sub: (a: EthAmount, b: EthAmount): EthAmount => Big(a).minus(b).toString(),
  times: (a: EthAmount, quantity: number): EthAmount => Big(a).times(quantity).toString(),
  percent: (a: EthAmount, pct: number): EthAmount => Big(a).times(pct).div(100).round(MAX_DISPLAY_DECIMALS, Big.roundDown).toString(),
  sum: (values: EthAmount[]): EthAmount => values.reduce<Big>((acc, v) => acc.plus(v), Big(0)).toString(),
  compare: (a: EthAmount, b: EthAmount): -1 | 0 | 1 => Big(a).cmp(b),
  eq: (a: EthAmount, b: EthAmount) => Big(a).eq(b),
  max: (a: EthAmount, b: EthAmount): EthAmount => (Big(a).gte(b) ? a : b),
}

/** "26.846", "1.19", "0.016": at least two decimals, trailing zeros trimmed. */
export function formatEthValue(value: EthAmount): string {
  const fixed = Big(value).toFixed(MAX_DISPLAY_DECIMALS)
  const [int, dec = ''] = fixed.split('.')
  const trimmed = dec.replace(/0+$/, '').padEnd(MIN_DISPLAY_DECIMALS, '0')
  return `${int}.${trimmed}`
}

export function formatEth(value: EthAmount): string {
  return `${formatEthValue(value)} ETH`
}
