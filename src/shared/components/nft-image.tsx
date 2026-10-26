import type { Image } from '@/shared/contracts/common'
import { cn } from '@/shared/lib/utils'

interface NftImageProps {
  image: Image
  /** CSS `sizes` for the rendered width, so the browser picks the right candidate. */
  sizes: string
  className?: string
  /** Above-the-fold images load eagerly with high priority (LCP). */
  priority?: boolean
  alt?: string
}

export function NftImage({ image, sizes, className, priority = false, alt }: NftImageProps) {
  return (
    <img
      src={image.src}
      srcSet={image.srcSet}
      sizes={sizes}
      width={image.width}
      height={image.height}
      alt={alt ?? image.alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding={priority ? 'sync' : 'async'}
      className={cn('aspect-square object-cover', className)}
    />
  )
}
