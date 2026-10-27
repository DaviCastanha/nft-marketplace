import type { Page } from '@playwright/test'
import { apiCall, expect, gotoApp, reloadApp, test } from './fixtures'

const isMobile = (projectName: string) => projectName === 'mobile'

/** Names rendered in the catalog grid, in order. */
async function gridNames(page: Page) {
  const list = page.getByRole('list').filter({ has: page.getByRole('article') }).first()
  return list.getByRole('heading', { level: 3 }).allInnerTexts()
}

async function apiNames(page: Page, query: string) {
  const response = await apiCall(page, 'GET', `/nfts?${query}`)
  return (response.body as { items: Array<{ name: string }> }).items.map((item) => item.name)
}

async function toggleFilter(page: Page, projectName: string, name: RegExp) {
  if (isMobile(projectName)) {
    await page.getByRole('button', { name: 'Abrir filtros' }).click()
    const sheet = page.getByRole('dialog', { name: 'Filtros' })
    await sheet.getByRole('button', { name }).click()
    await page.keyboard.press('Escape')
  } else {
    await page.getByRole('complementary', { name: 'Filtros do catálogo' }).getByRole('button', { name }).click()
  }
}

async function search(page: Page, projectName: string, term: string) {
  if (isMobile(projectName)) {
    const input = page.getByRole('searchbox', { name: 'Buscar NFTs' })
    await input.fill(term)
    await input.press('Enter')
  } else {
    await page.getByRole('button', { name: 'Buscar NFTs' }).click()
    await page.getByRole('dialog', { name: 'Buscar NFTs' }).getByLabel('Termo de busca').fill(term)
    await page.keyboard.press('Enter')
  }
}

test.describe('catálogo', () => {
  test('busca, filtros combinados e ordenação refletem a URL e a API', async ({ page }, info) => {
    await gotoApp(page, '/')
    await expect(page.getByRole('link', { name: 'Emerald Ape #042', exact: true })).toBeVisible()

    await search(page, info.project.name, 'emerald')
    await expect(page).toHaveURL(/[?&]q=emerald/)
    await expect.poll(() => gridNames(page)).toEqual(['Emerald Ape #042'])

    await page.getByRole('button', { name: 'limpar busca' }).click()
    await expect(page).not.toHaveURL(/q=/)

    await toggleFilter(page, info.project.name, /^Arte digital/)
    await toggleFilter(page, info.project.name, /^Ethereum/)
    await expect(page).toHaveURL(/category=arte-digital/)
    await expect(page).toHaveURL(/network=ethereum/)
    await expect.poll(() => gridNames(page)).toEqual(await apiNames(page, 'category=arte-digital&network=ethereum'))

    if (!isMobile(info.project.name)) {
      await page.getByRole('combobox', { name: 'Ordenar por:' }).click()
      await page.getByRole('option', { name: 'Menor preço' }).click()
      await expect(page).toHaveURL(/sort=price-asc/)
      await expect.poll(() => gridNames(page)).toEqual(await apiNames(page, 'category=arte-digital&network=ethereum&sort=price-asc'))
    }
  })

  test('paginação, reinício da página ao filtrar e restauração pelo histórico', async ({ page }, info) => {
    await gotoApp(page, '/')
    const pagination = page.getByRole('navigation', { name: 'Paginação do catálogo' })
    await pagination.getByRole('link', { name: 'Página 2 de 8' }).click()
    await expect(page).toHaveURL(/page=2/)
    const pageTwo = await apiNames(page, 'page=2')
    await expect.poll(() => gridNames(page)).toEqual(pageTwo)

    // Changing a filter returns to the first page.
    await toggleFilter(page, info.project.name, /^Polygon/)
    await expect(page).toHaveURL(/network=polygon/)
    await expect(page).not.toHaveURL(/page=/)

    // Back restores page 2 without the filter; forward restores the filter.
    await page.goBack()
    await expect(page).toHaveURL(/page=2/)
    await expect.poll(() => gridNames(page)).toEqual(pageTwo)
    await page.goForward()
    await expect(page).toHaveURL(/network=polygon/)
    await expect.poll(() => gridNames(page)).toEqual(await apiNames(page, 'network=polygon'))

    // A refresh keeps the state from the URL.
    await reloadApp(page)
    await expect.poll(() => gridNames(page)).toEqual(await apiNames(page, 'network=polygon'))
  })

  test('respostas fora de ordem não sobrescrevem a busca mais recente', async ({ page, mock }, info) => {
    test.skip(isMobile(info.project.name), 'Cenário de rede validado no desktop')
    await gotoApp(page, '/')
    await expect(page.getByRole('link', { name: 'Emerald Ape #042', exact: true })).toBeVisible()
    await mock.scenario('out-of-order')

    // Each new catalog request answers faster than the previous one, so the first ones arrive last.
    await toggleFilter(page, info.project.name, /^Fotografia/)
    await toggleFilter(page, info.project.name, /^Música/)
    await toggleFilter(page, info.project.name, /^Solana/)
    await expect(page).toHaveURL(/network=solana/)
    await page.waitForTimeout(2_500) // let every slower, superseded response land
    await mock.scenario('default')
    expect(await gridNames(page)).toEqual(await apiNames(page, 'category=fotografia&category=musica&network=solana'))
  })

  test('resultado vazio oferece limpar a busca', async ({ page }, info) => {
    await gotoApp(page, '/')
    await search(page, info.project.name, 'nada-com-esse-nome')
    await expect(page.getByRole('heading', { name: 'Nenhum NFT encontrado' })).toBeVisible()
    await page.getByRole('button', { name: 'Limpar busca e filtros' }).click()
    await expect(page.getByRole('link', { name: 'Emerald Ape #042', exact: true })).toBeVisible()
  })
})
