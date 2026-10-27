import type { Page } from '@playwright/test'
import { expect } from './fixtures'

/** From the cart to an open review dialog, with the primary wallet connected. */
export async function openReview(page: Page) {
  await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
  await expect(page).toHaveURL(/\/checkout$/)
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(page.getByText(/Conectada:/)).toBeVisible()
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  const dialog = page.getByRole('dialog', { name: 'Revise seu pedido' })
  await expect(dialog).toBeVisible()
  return dialog
}

export const receiptHeading = (page: Page) => page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })

export function orderIdFromUrl(page: Page) {
  const match = /\/orders\/([^/?#]+)/.exec(page.url())
  if (!match) throw new Error(`Not on an order page: ${page.url()}`)
  return match[1]!
}
