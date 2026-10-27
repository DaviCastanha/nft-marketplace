import { openReview, orderIdFromUrl, receiptHeading } from './checkout-helpers'
import { ALICE, addToCartViaApi, apiCall, expect, gotoApp, login, reloadApp, test } from './fixtures'

test.describe('compra completa', () => {
  test('do catálogo ao recibo confirmado', async ({ page }, info) => {
    await login(page, ALICE, '/')
    await page.getByRole('link', { name: 'Ivory Baron #088', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Ivory Baron #088' })).toBeVisible()
    const increase = page.getByRole('button', { name: 'Aumentar quantidade de Ivory Baron #088' }).filter({ visible: true })
    await increase.click()
    const buy = info.project.name === 'mobile' ? page.getByRole('button', { name: 'Comprar NFT' }) : page.getByRole('button', { name: 'COMPRAR', exact: true })
    await buy.click()

    await expect(page).toHaveURL(/\/cart$/)
    // 2 × 1.79 + 0.016 network fee.
    await expect(page.getByTestId('quote-total')).toHaveText('3.596 ETH')
    const dialog = await openReview(page)
    await expect(dialog.getByTestId('quote-total')).toHaveText('3.596 ETH')
    await dialog.getByRole('button', { name: 'Confirmar e pagar' }).click()

    await expect(page).toHaveURL(/\/orders\//)
    await expect(receiptHeading(page)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('table')).toContainText('Ivory Baron #088')
    await expect(page.getByRole('table')).toContainText('(x 2)')
    await expect(page.getByText(/Transação confirmada na Ethereum/)).toBeVisible()

    // The purchased items left the cart.
    await gotoApp(page, '/cart')
    await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()
  })

  test('recibo reproduz o snapshot do pedido e o carrinho perde só o que foi comprado', async ({ page, mock }) => {
    await login(page, ALICE, '/')
    await mock.scenario('order-pending')
    await addToCartViaApi(page, [{ nftId: 'golden-beat-207', quantity: 1 }])
    await gotoApp(page, '/cart')
    const dialog = await openReview(page)
    await dialog.getByRole('button', { name: 'Confirmar e pagar' }).click()
    await expect(page.getByRole('heading', { name: 'Pagamento em processamento' })).toBeVisible()
    const orderId = orderIdFromUrl(page)

    // While the payment is pending, another unit and another NFT go into the cart.
    await addToCartViaApi(page, [
      { nftId: 'golden-beat-207', quantity: 1 },
      { nftId: 'golden-signal-160', quantity: 1 },
    ])
    await mock.resolveOrder(orderId, 'confirmed')
    await expect(receiptHeading(page)).toBeVisible()

    const cart = (await apiCall(page, 'GET', '/cart')).body as { items: Array<{ nftId: string; quantity: number }> }
    expect(cart.items.map(({ nftId, quantity }) => ({ nftId, quantity }))).toEqual([
      { nftId: 'golden-beat-207', quantity: 1 },
      { nftId: 'golden-signal-160', quantity: 1 },
    ])

    // Later catalog changes never alter the receipt.
    await mock.updateNft('golden-beat-207', { editionId: '1-50', price: '9.99' })
    await reloadApp(page)
    await expect(page.getByRole('table')).toContainText('0.99 ETH')
    await expect(page.getByRole('table')).not.toContainText('9.99 ETH')
  })
})
