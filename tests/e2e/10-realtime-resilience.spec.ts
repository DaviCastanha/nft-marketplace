import { openReview, orderIdFromUrl, receiptHeading } from './checkout-helpers'
import { ALICE, BRUNO, addToCartViaApi, expect, gotoApp, login, reloadApp, test } from './fixtures'

const detailPrice = (page: import('@playwright/test').Page) => page.locator('header').filter({ has: page.locator('#nft-title') }).getByText(/ETH$/).first()

test.describe('resiliência do tempo real', () => {
  test('eventos duplicados ou antigos não regridem o estado', async ({ page, mock }, info) => {
    test.skip(info.project.name === 'mobile', 'Preço do cabeçalho do detalhe é exibido no desktop')
    await gotoApp(page, '/nfts/emerald-ape-042')
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()

    await mock.updateNft('emerald-ape-042', { editionId: '1-50', price: '1.50' })
    await expect(detailPrice(page)).toContainText('1.50 ETH')

    await mock.replayLastEvent('duplicate')
    await mock.replayLastEvent('stale')
    await mock.updateNft('emerald-ape-042', { editionId: '1-50', price: '1.60' })
    await expect(detailPrice(page)).toContainText('1.60 ETH')
    await mock.replayLastEvent('stale')
    await page.waitForTimeout(400)
    await expect(detailPrice(page)).toContainText('1.60 ETH')
  })

  test('reconexão reconcilia o estado com a API REST', async ({ page, mock }, info) => {
    test.skip(info.project.name === 'mobile', 'Preço do cabeçalho do detalhe é exibido no desktop')
    await gotoApp(page, '/nfts/emerald-ape-042')
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()

    // The change happens while the connection is down; the event is lost, the refetch after reconnecting is not.
    await mock.dropSocket()
    await mock.updateNft('emerald-ape-042', { editionId: '1-50', price: '1.75' })
    await expect(detailPrice(page)).toContainText('1.75 ETH', { timeout: 10_000 })
  })

  test('pedido pendente é retomado após recarregar, sem nova compra', async ({ page, mock }) => {
    await login(page, ALICE, '/')
    await mock.scenario('order-pending')
    await addToCartViaApi(page, [{ nftId: 'golden-signal-160', quantity: 1 }])
    await gotoApp(page, '/cart')
    const dialog = await openReview(page)
    await dialog.getByRole('button', { name: 'Confirmar e pagar' }).click()
    await expect(page.getByRole('heading', { name: 'Pagamento em processamento' })).toBeVisible()
    const orderId = orderIdFromUrl(page)

    await mock.dropSocket()
    await reloadApp(page)
    await expect(page.getByRole('heading', { name: 'Pagamento em processamento' })).toBeVisible()

    // Going back to the checkout points to the pending order instead of allowing another purchase.
    await gotoApp(page, '/checkout')
    await expect(page.getByText('Você tem um pedido aguardando confirmação.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeDisabled()
    await page.getByRole('link', { name: 'Acompanhar pedido' }).click()

    await mock.resolveOrder(orderId, 'confirmed')
    await expect(receiptHeading(page)).toBeVisible({ timeout: 10_000 })
    expect(orderIdFromUrl(page)).toBe(orderId)
  })

  test('pedido de outro usuário não é acessível', async ({ page, mock }) => {
    await login(page, ALICE, '/')
    await mock.scenario('order-pending')
    await addToCartViaApi(page, [{ nftId: 'golden-signal-160', quantity: 1 }])
    await gotoApp(page, '/cart')
    const dialog = await openReview(page)
    await dialog.getByRole('button', { name: 'Confirmar e pagar' }).click()
    await expect(page.getByRole('heading', { name: 'Pagamento em processamento' })).toBeVisible()
    const orderId = orderIdFromUrl(page)

    await gotoApp(page, '/account/profile')
    await page.getByRole('navigation', { name: 'Minha conta' }).getByRole('button', { name: 'Sair' }).click()
    await expect(page).toHaveURL(/\/$/)
    await login(page, BRUNO, `/orders/${orderId}`)
    await expect(page.getByRole('heading', { name: 'Pedido não encontrado' })).toBeVisible()
  })
})
