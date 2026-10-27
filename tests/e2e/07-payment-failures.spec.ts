import { openReview, receiptHeading } from './checkout-helpers'
import { ALICE, addToCartViaApi, expect, gotoApp, login, test } from './fixtures'

test.describe('falhas de pagamento', () => {
  test.skip(({ isMobile }) => isMobile, 'Fluxos de falha validados no desktop')

  test('pagamento recusado preserva os itens no carrinho', async ({ page, mock }) => {
    await login(page, ALICE, '/')
    await mock.scenario('payment-rejected')
    await addToCartViaApi(page, [{ nftId: 'emerald-ape-042', quantity: 1 }])
    await gotoApp(page, '/cart')
    const dialog = await openReview(page)
    await dialog.getByRole('button', { name: 'Confirmar e pagar' }).click()

    await expect(page.getByRole('heading', { name: 'Pagamento recusado' })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Nenhum valor foi cobrado e os itens continuam no seu carrinho.')).toBeVisible()
    await expect(receiptHeading(page)).toHaveCount(0)
    await page.getByRole('link', { name: 'Voltar ao carrinho' }).click()
    await expect(page.getByRole('list', { name: 'Itens do carrinho' }).getByRole('article')).toHaveCount(1)
  })

  test('clique repetido cria um único pedido', async ({ page }) => {
    await login(page, ALICE, '/')
    await addToCartViaApi(page, [{ nftId: 'golden-signal-160', quantity: 1 }])
    await gotoApp(page, '/cart')
    const dialog = await openReview(page)

    const posts: string[] = []
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().endsWith('/api/orders')) posts.push(request.headers()['idempotency-key'] ?? '')
    })
    const confirm = dialog.getByRole('button', { name: 'Confirmar e pagar' })
    await confirm.click()
    await confirm.click({ force: true, timeout: 1_000 }).catch(() => undefined)
    await confirm.click({ force: true, timeout: 1_000 }).catch(() => undefined)

    await expect(receiptHeading(page)).toBeVisible({ timeout: 10_000 })
    expect(posts).toHaveLength(1)
  })

  test('timeout após a criação recupera o mesmo pedido pela chave de idempotência', async ({ page, mock }) => {
    await page.clock.install()
    await login(page, ALICE, '/')
    await mock.scenario('order-timeout')
    await addToCartViaApi(page, [{ nftId: 'golden-signal-160', quantity: 1 }])
    await gotoApp(page, '/cart')
    const dialog = await openReview(page)

    const attempts: import('@playwright/test').Request[] = []
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().endsWith('/api/orders')) attempts.push(request)
    })

    await dialog.getByRole('button', { name: 'Confirmar e pagar' }).click()
    await expect.poll(() => attempts.length).toBe(1)
    // The order was created, but its response never arrives: jump past the 10 s client timeout.
    await page.clock.fastForward(11_000)
    await expect(dialog.getByRole('alert')).toContainText('Não recebemos a confirmação do pedido')

    await dialog.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(receiptHeading(page)).toBeVisible({ timeout: 10_000 })

    expect(attempts).toHaveLength(2)
    expect(attempts[1]!.headers()['idempotency-key']).toBe(attempts[0]!.headers()['idempotency-key'])
    // 200 = existing order returned by idempotency (a new order would be 201).
    expect((await attempts[1]!.response())?.status()).toBe(200)
  })
})
