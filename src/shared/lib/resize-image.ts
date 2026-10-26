const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp']
const MAX_INPUT_BYTES = 8 * 1024 * 1024

export class ImageInputError extends Error {}

/**
 * Center-crops and downsizes an image on a canvas before upload (avatars are
 * small squares), so the request stays light regardless of the original file.
 */
export async function resizeImageToDataUrl(file: File, size = 256, quality = 0.85): Promise<string> {
  if (!ACCEPTED.includes(file.type)) throw new ImageInputError('Use uma imagem PNG, JPEG ou WebP.')
  if (file.size > MAX_INPUT_BYTES) throw new ImageInputError('A imagem deve ter no máximo 8 MB.')

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new ImageInputError('Não foi possível ler esta imagem.')
  })
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) throw new ImageInputError('Seu navegador não conseguiu processar a imagem.')
  context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', quality)
}
