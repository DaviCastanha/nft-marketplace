import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { ALICE, addToCartViaApi, expect, gotoApp, login, test } from './fixtures'

/** Serious and critical WCAG A/AA violations fail the test; the summary helps when they do. */
async function expectNoSeriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('#mock-panel').analyze()
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([])
}

test.describe('acessibilidade', () => {
  test('navegação por teclado: skip link e abertura de NFT', async ({ page }, info) => {
    test.skip(info.project.name === 'mobile', 'Navegação por teclado validada no desktop')
    await gotoApp(page, '/')
    await expect(page.getByRole('link', { name: 'Emerald Ape #042', exact: true })).toBeVisible()

    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Pular para o conteúdo' })
    await expect(skip).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('#main')).toBeFocused()

    const card = page.getByRole('link', { name: 'Emerald Ape #042', exact: true })
    await card.focus()
    await expect(card).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
  })

  test('diálogo mantém o foco, fecha com Esc e devolve o foco', async ({ page }, info) => {
    test.skip(info.project.name === 'mobile', 'Validado no desktop')
    await gotoApp(page, '/')
    const trigger = page.getByRole('button', { name: 'Buscar NFTs' })
    await trigger.click()
    const dialog = page.getByRole('dialog', { name: 'Buscar NFTs' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByLabel('Termo de busca')).toBeFocused()

    // Focus stays inside the dialog while tabbing around.
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab')
      expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('erros de formulário são associados aos campos', async ({ page }) => {
    await gotoApp(page, '/login')
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    const email = page.getByLabel('E-mail')
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    await expect(email).toBeFocused()
    const describedBy = await email.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    await expect(page.locator(`[id="${describedBy}"]`)).toHaveText('Informe um e-mail válido')
  })

  test('páginas principais sem violações graves (axe)', async ({ page }) => {
    test.setTimeout(90_000)
    await gotoApp(page, '/')
    await expect(page.getByRole('link', { name: 'Emerald Ape #042', exact: true })).toBeVisible()
    await expectNoSeriousViolations(page)

    await gotoApp(page, '/nfts/emerald-ape-042')
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
    await expectNoSeriousViolations(page)

    await addToCartViaApi(page, [{ nftId: 'emerald-ape-042', quantity: 1 }])
    await gotoApp(page, '/cart')
    await expect(page.getByTestId('quote-total')).toBeVisible()
    await expectNoSeriousViolations(page)

    await login(page, ALICE, '/checkout')
    await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible()
    await expectNoSeriousViolations(page)

    await gotoApp(page, '/account/wallets')
    await expect(page.getByRole('heading', { name: 'Carteira principal' })).toBeVisible()
    await expectNoSeriousViolations(page)
  })
})
