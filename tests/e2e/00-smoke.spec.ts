import { expect, test } from '@playwright/test'

test('REST goes through MSW and mock events reach the UI through Socket.IO', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByTestId('health')).toHaveText('REST: ok')
  await expect(page.getByTestId('socket')).toHaveText('Socket: connected')

  await page.getByRole('button', { name: 'Disparar evento no mock' }).click()
  await expect(page.getByTestId('events')).toContainText('hello from the mock server')
})

test('unknown routes render the not found page after a direct load', async ({ page }) => {
  await page.goto('/rota-que-nao-existe')
  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
})
