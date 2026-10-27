import { expect, test } from '@playwright/test'

test('home renders the catalog from the mocked API', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Emerald Ape #042', exact: true })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Paginação do catálogo' })).toBeVisible()
})

test('unknown routes render the not found page after a direct load', async ({ page }) => {
  await page.goto('/rota-que-nao-existe')
  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
})
