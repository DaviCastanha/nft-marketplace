import { expect, gotoApp, reloadApp, test } from './fixtures'

test.describe('detalhe do NFT', () => {
  test('acesso direto, refresh e NFT inexistente', async ({ page }) => {
    await gotoApp(page, '/nfts/ivory-baron-088')
    await expect(page.getByRole('heading', { level: 1, name: 'Ivory Baron #088' })).toBeVisible()
    await reloadApp(page)
    await expect(page.getByRole('heading', { level: 1, name: 'Ivory Baron #088' })).toBeVisible()

    await gotoApp(page, '/nfts/nao-existe-123')
    await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
    await page.getByRole('link', { name: 'Explorar o mercado' }).click()
    await expect(page.getByRole('link', { name: 'Emerald Ape #042', exact: true })).toBeVisible()
  })

  test('edição esgotada fica indisponível e a quantidade respeita o limite', async ({ page, mock }) => {
    await gotoApp(page, '/')
    await mock.updateNft('emerald-ape-042', { editionId: '1-50', available: 3 })
    await gotoApp(page, '/nfts/emerald-ape-042')

    const edition = page.getByRole('radio', { name: '1/50' })
    await expect(edition).toHaveAttribute('aria-checked', 'true')
    const increase = page.getByRole('button', { name: 'Aumentar quantidade de Emerald Ape #042' }).first()
    await increase.click()
    await increase.click()
    await expect(increase).toBeDisabled()
    await expect(page.getByRole('group', { name: 'Quantidade de Emerald Ape #042' }).first().locator('output')).toHaveText('3')

    // Selling out the edition while the page is open (event via Socket.IO) disables it.
    await mock.updateNft('emerald-ape-042', { editionId: '1-50', available: 0 })
    await expect(page.getByRole('radio', { name: /1\/50.*esgotada/ })).toHaveAttribute('aria-disabled', 'true')
    await expect(page.getByText('A edição 1/50 está esgotada. Escolha outra edição.')).toBeVisible()
  })
})
