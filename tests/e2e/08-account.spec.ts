import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { ALICE, BRUNO, expect, gotoApp, login, reloadApp, test } from './fixtures'

/** A real artwork from the repo goes through the avatar pipeline (decode → canvas crop → JPEG upload). */
const AVATAR = readFileSync(fileURLToPath(new URL('../../public/nfts/emerald-160.webp', import.meta.url)))

test.describe('perfil e carteiras', () => {
  test('edição do perfil com validação, conflito e persistência', async ({ page }) => {
    await login(page, ALICE, '/account/profile')
    const username = page.getByLabel('Nome de usuário')

    await username.fill('nome inválido!')
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('Use apenas letras, números, ponto e sublinhado')).toBeVisible()
    await expect(username).toHaveAttribute('aria-invalid', 'true')

    await username.fill('bruno')
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('Este nome de usuário já está em uso.')).toBeVisible()

    await username.fill('alice.martins')
    await page.getByLabel('Nome de exibição').fill('Alice M.')
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByTestId('live-announcer')).toContainText('Perfil atualizado.')
    await reloadApp(page)
    await expect(page.getByLabel('Nome de exibição')).toHaveValue('Alice M.')
    await expect(page.getByLabel('Nome de usuário')).toHaveValue('alice.martins')
  })

  test('avatar e alteração de senha', async ({ page }) => {
    await login(page, ALICE, '/account/profile')
    await page.getByLabel('Escolher imagem de avatar').setInputFiles({ name: 'avatar.webp', mimeType: 'image/webp', buffer: AVATAR })
    await expect(page.getByRole('img', { name: 'Seu avatar atual' })).toBeVisible()
    await page.getByRole('button', { name: 'Remover' }).click()
    await expect(page.getByRole('img', { name: 'Sem avatar' })).toBeVisible()

    await page.getByLabel('Senha atual').fill('errada123')
    await page.getByLabel('Nova senha', { exact: true }).fill('NovaSenha123')
    await page.getByLabel('Confirmar nova senha').fill('NovaSenha123')
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('Senha atual incorreta.')).toBeVisible()

    await page.getByLabel('Senha atual').fill(ALICE.password)
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByTestId('live-announcer')).toContainText('Perfil e senha atualizados.')

    await page.getByRole('navigation', { name: 'Minha conta' }).getByRole('button', { name: 'Sair' }).click()
    await expect(page).toHaveURL(/\/$/)
    await login(page, { ...ALICE, password: 'NovaSenha123' }, '/account/profile')
    await expect(page.getByLabel('Nome de exibição')).toHaveValue(ALICE.name)
  })

  test('cadastro de carteiras principal e secundária com erros de validação', async ({ page }) => {
    await login(page, BRUNO, '/account/wallets')
    await page.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(page.getByText('Informe o apelido da carteira')).toBeVisible()
    await expect(page.getByText('Selecione uma rede').first()).toBeVisible()

    await page.getByLabel('Apelido da carteira').fill('Cofre do Bruno')
    await page.getByRole('combobox', { name: 'Rede' }).click()
    await page.getByRole('option', { name: 'Polygon' }).click()
    await page.getByLabel('Nome do perfil').fill('bruno.colecao')
    await page.getByLabel('Endereço da carteira').fill('0x123')
    await page.getByRole('combobox', { name: 'Tipo de carteira' }).click()
    await page.getByRole('option', { name: 'Coinbase Wallet' }).click()
    await page.getByLabel('Código de indicação').fill('KURIO-BRUNO')
    await page.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(page.getByText('Informe um endereço 0x válido com 40 caracteres hexadecimais')).toBeVisible()

    await page.getByLabel('Endereço da carteira').fill('0x1111111111111111111111111111111111111111')
    await page.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(page.getByTestId('live-announcer')).toContainText('Carteira principal salva.')
    await expect(page.getByText('Cofre do Bruno')).toBeVisible()

    await page.getByLabel('Igual à carteira principal').check()
    await page.getByRole('button', { name: 'Adicionar' }).click()
    await expect(page.getByLabel('Apelido da carteira')).toHaveValue('Cofre do Bruno (cópia)')
    await page.getByLabel('Endereço da carteira').fill('0x2222222222222222222222222222222222222222')
    await page.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(page.getByTestId('live-announcer')).toContainText('Carteira secundária salva.')

    await reloadApp(page)
    await expect(page.getByText('Cofre do Bruno (cópia)')).toBeVisible()
    await gotoApp(page, '/account/wallets')
    await expect(page.getByText('0x2222…2222')).toBeVisible()
  })
})
