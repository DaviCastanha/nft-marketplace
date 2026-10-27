import { ALICE, BRUNO, addToCartViaApi, expect, gotoApp, login, test } from './fixtures'

test.describe('cadastro, login e sessão', () => {
  test('cadastro valida campos, trata conflito e autentica', async ({ page }) => {
    await gotoApp(page, '/signup')
    await page.getByRole('button', { name: /Criar (conta|perfil)/ }).last().click()
    await expect(page.getByText('Use pelo menos 3 caracteres')).toBeVisible()
    await expect(page.getByText('Informe um e-mail válido')).toBeVisible()

    await page.getByLabel('Nome de usuário').fill('nova_colecionadora')
    await page.getByLabel('E-mail').fill(ALICE.email)
    await page.getByLabel('Senha', { exact: true }).fill('Segura123')
    await page.getByLabel('Confirmar senha').fill('Outra123')
    await page.getByRole('button', { name: /Criar (conta|perfil)/ }).last().click()
    await expect(page.getByText('As senhas não conferem')).toBeVisible()

    await page.getByLabel('Confirmar senha').fill('Segura123')
    await page.getByRole('button', { name: /Criar (conta|perfil)/ }).last().click()
    const emailField = page.getByLabel('E-mail')
    await expect(page.getByText('Este e-mail já está cadastrado. Tente entrar.')).toBeVisible()
    await expect(emailField).toHaveAttribute('aria-invalid', 'true')

    await emailField.fill('nova@jungle.test')
    await page.getByRole('button', { name: /Criar (conta|perfil)/ }).last().click()
    await expect(page).toHaveURL(/\/$/)
    await gotoApp(page, '/account/profile')
    await expect(page.getByLabel('Nome de usuário')).toHaveValue('nova_colecionadora')
  })

  test('login inválido, retorno à rota privada e persistência após refresh', async ({ page }) => {
    await gotoApp(page, '/account/profile')
    await expect(page).toHaveURL(/\/login\?redirect=%2Faccount%2Fprofile/)
    await page.getByLabel('E-mail').fill(ALICE.email)
    await page.getByLabel('Senha', { exact: true }).fill('errada123')
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('E-mail ou senha incorretos')

    await page.getByLabel('Senha', { exact: true }).fill(ALICE.password)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).toHaveURL(/\/account\/profile$/)
    await expect(page.getByLabel('Nome de exibição')).toHaveValue(ALICE.name)
    await page.reload()
    await expect(page.getByLabel('Nome de exibição')).toHaveValue(ALICE.name)
  })

  test('expiração da sessão durante a navegação preserva o retorno', async ({ page, mock }) => {
    await login(page, ALICE, '/account/profile')
    await expect(page.getByLabel('Nome de exibição')).toHaveValue(ALICE.name)
    await mock.expireSessions()

    await page.getByRole('navigation', { name: 'Minha conta' }).getByRole('link', { name: 'Lista de interesse' }).click()
    await expect(page).toHaveURL(/\/login\?redirect=%2Ffavorites&reason=expired/)
    await expect(page.getByText('Sua sessão expirou. Entre novamente para continuar de onde parou.')).toBeVisible()

    await page.getByLabel('E-mail').fill(ALICE.email)
    await page.getByLabel('Senha', { exact: true }).fill(ALICE.password)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).toHaveURL(/\/favorites$/)
    await expect(page.getByRole('heading', { name: 'Lista de interesse' })).toBeVisible()
  })

  test('logout e troca de usuário não expõem dados da sessão anterior', async ({ page }) => {
    await login(page, ALICE, '/favorites')
    await expect(page.getByRole('link', { name: 'Sage Nomad #009', exact: true })).toBeVisible()
    await addToCartViaApi(page, [{ nftId: 'golden-beat-207', quantity: 2 }])

    await page.getByRole('navigation', { name: 'Minha conta' }).getByRole('button', { name: 'Sair' }).click()
    await expect(page).toHaveURL(/\/$/)
    await gotoApp(page, '/favorites')
    await expect(page).toHaveURL(/\/login/)

    await page.getByLabel('E-mail').fill(BRUNO.email)
    await page.getByLabel('Senha', { exact: true }).fill(BRUNO.password)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).toHaveURL(/\/favorites$/)
    await expect(page.getByText('Você ainda não favoritou nenhum NFT.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Sage Nomad #009', exact: true })).toHaveCount(0)

    await gotoApp(page, '/cart')
    await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()
  })
})
