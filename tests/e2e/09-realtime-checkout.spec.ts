import { openReview, receiptHeading } from './checkout-helpers'
import { ALICE, addToCartViaApi, expect, gotoApp, login, test } from './fixtures'

test.describe('tempo real durante a compra', () => {
  test('preço alterado com o carrinho aberto atualiza o resumo e informa o usuário', async ({ page, mock }) => {
    await login(page, ALICE, '/')
    await addToCartViaApi(page, [{ nftId: 'emerald-ape-042', quantity: 2 }])
    await gotoApp(page, '/cart')
    await expect(page.getByTestId('quote-total')).toHaveText('2.396 ETH')

    // The change happens in the mock and reaches the page only through Socket.IO.
    await mock.updateNft('emerald-ape-042', { editionId: '1-50', price: '1.50' })
    await expect(page.getByTestId('quote-total')).toHaveText('3.016 ETH')
    await expect(page.getByText('O preço de Emerald Ape #042 mudou de 1.19 ETH para 1.50 ETH.')).toBeVisible()
    await expect(page.getByTestId('live-announcer')).toContainText('(edição 1/50) mudou de 1.19 ETH para 1.50 ETH')
  })

  test('checkout não confirma com cotação desatualizada', async ({ page, mock }, info) => {
    test.skip(info.project.name === 'mobile', 'Validado no desktop')
    await login(page, ALICE, '/')
    await addToCartViaApi(page, [{ nftId: 'emerald-ape-042', quantity: 1 }])
    await gotoApp(page, '/cart')
    const dialog = await openReview(page)

    await mock.updateNft('emerald-ape-042', { editionId: '1-50', price: '1.37' })
    await expect(dialog.getByText('Os valores mudaram desde que você abriu a revisão:')).toBeVisible()
    await expect(dialog.getByText('Emerald Ape #042: preço de 1.19 ETH para 1.37 ETH.')).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Confirmar e pagar' })).toBeDisabled()

    await dialog.getByRole('button', { name: 'Revisei os novos valores' }).click()
    await dialog.getByRole('button', { name: 'Confirmar e pagar' }).click()
    await expect(receiptHeading(page)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('table')).toContainText('1.37 ETH')
  })

  test('mudança perdida pelo cliente é barrada pela API (QUOTE_STALE)', async ({ page, mock }, info) => {
    test.skip(info.project.name === 'mobile', 'Validado no desktop')
    await login(page, ALICE, '/')
    await addToCartViaApi(page, [{ nftId: 'golden-beat-207', quantity: 1 }])
    await gotoApp(page, '/cart')
    const dialog = await openReview(page)

    // The event is lost in transit, so only the API's revalidation can catch the change.
    await mock.pauseEvents(true)
    await mock.updateNft('golden-beat-207', { editionId: '1-50', price: '1.25' })
    await dialog.getByRole('button', { name: 'Confirmar e pagar' }).click()

    await expect(dialog.getByRole('alert').filter({ hasText: 'Preços ou condições mudaram' })).toBeVisible()
    await expect(dialog.getByText('Golden Beat #207: preço de 0.99 ETH para 1.25 ETH.')).toBeVisible()
    await mock.pauseEvents(false)
    await dialog.getByRole('button', { name: 'Revisei os novos valores' }).click()
    await dialog.getByRole('button', { name: 'Confirmar e pagar' }).click()
    await expect(receiptHeading(page)).toBeVisible({ timeout: 10_000 })
  })

  test('edição esgotada durante a revisão impede a confirmação', async ({ page, mock }, info) => {
    test.skip(info.project.name === 'mobile', 'Validado no desktop')
    await login(page, ALICE, '/')
    await addToCartViaApi(page, [{ nftId: 'golden-signal-160', quantity: 1 }])
    await gotoApp(page, '/cart')
    const dialog = await openReview(page)

    await mock.updateNft('golden-signal-160', { editionId: '1-50', available: 0 })
    await expect(dialog.getByText('Golden Signal #160: a edição 1/50 esgotou.')).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Confirmar e pagar' })).toBeDisabled()
    await expect(dialog.getByRole('button', { name: 'Revisei os novos valores' })).toHaveCount(0)
  })
})
