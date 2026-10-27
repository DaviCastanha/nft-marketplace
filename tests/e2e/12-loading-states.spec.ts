import { addToCartViaApi, expect, gotoApp, test } from './fixtures'

test.describe('carregamento, falha e recuperação', () => {
  test('skeletons durante carregamento lento no catálogo, detalhe e resumo do carrinho', async ({ page, mock }) => {
    await gotoApp(page, '/')
    await addToCartViaApi(page, [{ nftId: 'golden-signal-160', quantity: 1 }])
    await mock.scenario('slow')

    await gotoApp(page, '/')
    await expect(page.getByRole('status', { name: 'Carregando NFTs' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Emerald Ape #042', exact: true })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('status', { name: 'Carregando NFTs' })).toHaveCount(0)

    await gotoApp(page, '/nfts/golden-signal-160')
    await expect(page.getByRole('status', { name: 'Carregando NFT' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: 'Golden Signal #160' })).toBeVisible({ timeout: 10_000 })

    await gotoApp(page, '/cart')
    await expect(page.getByRole('status', { name: 'Carregando carrinho' })).toBeVisible()
    await expect(page.getByRole('status', { name: 'Calculando resumo' })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('quote-total')).toHaveText('0.406 ETH', { timeout: 10_000 })
  })

  test('falha transitória mostra erro e recupera com nova tentativa', async ({ page, mock }) => {
    await gotoApp(page, '/')
    await mock.scenario('flaky')
    await gotoApp(page, '/?page=2')
    // Initial attempt + automatic retries fail; the UI explains and offers a manual retry.
    const alert = page.getByRole('alert').filter({ hasText: 'Não foi possível carregar os NFTs' })
    await expect(alert).toBeVisible({ timeout: 15_000 })
    await alert.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.getByRole('navigation', { name: 'Paginação do catálogo' })).toBeVisible()
    await expect(page.getByRole('link', { name: /Página 2 de 8/ })).toHaveAttribute('aria-current', 'page')
  })

  test('sem conexão: feedback e retomada quando a rede volta', async ({ page, mock }) => {
    await gotoApp(page, '/nfts/emerald-ape-042')
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
    await mock.scenario('offline')
    await gotoApp(page, '/nfts/golden-beat-207')
    await expect(page.getByRole('alert').filter({ hasText: 'Sem conexão com o servidor.' })).toBeVisible({ timeout: 15_000 })

    await page.evaluate(() => fetch('/api/__mock/scenario', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'default' }) }))
    await page.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Golden Beat #207' })).toBeVisible()
  })
})
