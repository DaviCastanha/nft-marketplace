import type { Page } from '@playwright/test'
import { ALICE, addToCartViaApi, expect, gotoApp, login, reloadApp, test } from './fixtures'

const cartItems = (page: Page) => page.getByRole('list', { name: 'Itens do carrinho' }).getByRole('article')
const total = (page: Page) => page.getByTestId('quote-total')

test.describe('carrinho', () => {
  test('quantidades, remoção, cupom e persistência após refresh', async ({ page }) => {
    await gotoApp(page, '/')
    await addToCartViaApi(page, [
      { nftId: 'emerald-ape-042', quantity: 2 },
      { nftId: 'golden-signal-160', quantity: 1 },
    ])
    await gotoApp(page, '/cart')
    await expect(cartItems(page)).toHaveCount(2)
    // 2 × 1.19 + 1 × 0.39 = 2.77, plus 0.016 network fee.
    await expect(total(page)).toHaveText('2.786 ETH')

    await page.getByRole('button', { name: 'Aumentar quantidade de Golden Signal #160' }).filter({ visible: true }).click()
    await expect(total(page)).toHaveText('3.176 ETH')

    await page.getByRole('button', { name: 'Remover Emerald Ape #042 do carrinho' }).click()
    await expect(cartItems(page)).toHaveCount(1)
    await expect(total(page)).toHaveText('0.796 ETH')

    const coupon = page.getByLabel('Código promocional')
    await coupon.fill('NAOEXISTE')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Código promocional inválido.' })).toBeVisible()
    await coupon.fill('expired20')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Este código promocional expirou.' })).toBeVisible()
    await coupon.fill('jungle10')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByText('JUNGLE10', { exact: true })).toBeVisible()
    // 10% off 0.78 = 0.078 → 0.702 + 0.016.
    await expect(total(page)).toHaveText('0.718 ETH')

    await reloadApp(page)
    await expect(cartItems(page)).toHaveCount(1)
    await expect(total(page)).toHaveText('0.718 ETH')

    await page.getByRole('button', { name: 'Remover', exact: true }).click()
    await expect(total(page)).toHaveText('0.796 ETH')
  })

  test('itens do visitante são preservados ao entrar', async ({ page }) => {
    await gotoApp(page, '/nfts/neon-vessel-552')
    const buy = page.getByRole('button', { name: /^(COMPRAR|Comprar NFT)$/ }).filter({ visible: true })
    await buy.click()
    await expect(page).toHaveURL(/\/cart$/)
    await expect(cartItems(page)).toHaveCount(1)

    await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
    await expect(page).toHaveURL(/\/login\?redirect=%2Fcheckout/)
    await page.getByLabel('E-mail').fill(ALICE.email)
    await page.getByLabel('Senha', { exact: true }).fill(ALICE.password)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).toHaveURL(/\/checkout$/)
    await expect(page.getByRole('list', { name: 'Itens do pedido' }).getByText('Neon Vessel #552')).toBeVisible()

    await gotoApp(page, '/cart')
    await expect(cartItems(page)).toHaveCount(1)
  })

  test('limite por pedido é respeitado', async ({ page }) => {
    await login(page, ALICE, '/')
    await addToCartViaApi(page, [{ nftId: 'golden-beat-207', quantity: 10 }])
    await gotoApp(page, '/cart')
    await expect(page.getByRole('button', { name: 'Aumentar quantidade de Golden Beat #207' }).filter({ visible: true })).toBeDisabled()
  })
})
