import type { Page } from '@playwright/test'
import { ALICE, expect, gotoApp, login, reloadApp, test } from './fixtures'

/** Favorite toggle on the detail page: the top-bar heart on phones, the "Favoritar" button on desktop. */
const favoriteButton = (page: Page) => page.getByRole('button', { name: /^Favoritar/ }).filter({ visible: true }).first()

test.describe('favoritos', () => {
  test('favoritar é otimista e persiste para o usuário', async ({ page }) => {
    await login(page, ALICE, '/nfts/golden-signal-160')
    const button = favoriteButton(page)
    await expect(button).toHaveAttribute('aria-pressed', 'false')
    const saved = page.waitForResponse((r) => r.url().endsWith('/api/favorites/golden-signal-160') && r.request().method() === 'PUT')
    await button.click()
    // Optimistic: pressed before the API answers.
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByTestId('live-announcer')).toContainText('adicionado aos favoritos')
    expect((await saved).status()).toBe(204)

    await reloadApp(page)
    await expect(favoriteButton(page)).toHaveAttribute('aria-pressed', 'true')
    await gotoApp(page, '/favorites')
    await expect(page.getByRole('link', { name: 'Golden Signal #160', exact: true })).toBeVisible()
  })

  test('falha na mutation restaura o estado anterior', async ({ page, mock }) => {
    await login(page, ALICE, '/nfts/golden-signal-160')
    await mock.scenario('favorites-fail')
    const button = favoriteButton(page)
    await button.click()
    // Rolled back after the API error, with feedback to the user.
    await expect(page.getByText(/Não foi possível favoritar Golden Signal #160\. O estado anterior foi restaurado\./).first()).toBeVisible()
    await expect(button).toHaveAttribute('aria-pressed', 'false')

    await mock.scenario('default')
    await reloadApp(page)
    await expect(favoriteButton(page)).toHaveAttribute('aria-pressed', 'false')
  })

  test('visitante é levado ao login ao favoritar', async ({ page }) => {
    await gotoApp(page, '/nfts/golden-signal-160')
    await favoriteButton(page).click()
    await expect(page).toHaveURL(/\/login\?redirect=%2Fnfts%2Fgolden-signal-160/)
  })
})
