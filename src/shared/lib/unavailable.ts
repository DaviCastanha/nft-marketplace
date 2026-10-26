import { toast } from 'sonner'

/**
 * Editorial, support and other out-of-scope areas answer honestly instead of
 * pretending to work (they are not part of this delivery).
 */
export function notifyUnavailable(feature: string) {
  toast.info(`${feature} não está disponível nesta demonstração.`, { id: `unavailable-${feature}` })
}
