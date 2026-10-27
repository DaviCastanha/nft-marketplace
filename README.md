# Kurio — Marketplace de NFTs

Solução do desafio Frontend da Jungle Gaming: marketplace de NFTs em **React + TypeScript**, seguindo o layout do Figma, com os fluxos de descoberta, compra e conta funcionando sobre uma **API simulada com MSW** (REST + Socket.IO).

- **Demonstração:** https://nft-marketplace-davicastanha.vercel.app
- **Arquitetura, contratos e decisões:** [ARCHITECTURE.md](ARCHITECTURE.md)
- **Auditoria Lighthouse:** [lighthouse/summary.md](lighthouse/summary.md)

## Stack

| Responsabilidade | Tecnologia |
| --- | --- |
| Interface e linguagem | React 19, TypeScript (strict) |
| Build | Vite 8 |
| Roteamento | TanStack Router (file-based, search params validados com zod) |
| Estado remoto | TanStack Query |
| Cliente HTTP | Axios |
| Contratos | zod (compartilhados entre cliente e mocks) |
| Tempo real | socket.io-client |
| Estilo e componentes | Tailwind CSS 4 + shadcn/ui (Radix), adaptados aos tokens do Figma |
| Formulários | react-hook-form + zod |
| Valores em ETH | big.js (strings decimais) |
| Mocking | MSW 2 (REST) + @mswjs/socket.io-binding (Socket.IO) |
| Testes E2E e visuais | Playwright + axe-core |
| Auditoria | Lighthouse 13 |

## Como executar

Requisitos: **Node 22.19+** (o Lighthouse 13 exige essa versão; app e testes rodam em qualquer Node 22) e npm.

```bash
npm ci
npm run dev            # desenvolvimento com mocks em http://localhost:5173
```

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Desenvolvimento com a API simulada (MSW) |
| `npm run build:demo` | Build otimizado **com** mocks (é o que vai para a Vercel e o que é auditado/testado) |
| `npm run build` | Build de produção **sem** mocks (o MSW não entra no bundle) |
| `npm run preview` | Serve o último build em http://localhost:4173 |
| `npm run typecheck` | Verificação de tipos |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Playwright (gera `build:demo`, sobe o preview e roda desktop + mobile) |
| `npm run test:e2e:ui` | Playwright em modo UI |
| `npm run test:e2e:update` | Atualiza as baselines visuais |
| `npm run test:e2e:report` | Abre o relatório HTML (traces das falhas incluídos) |
| `npm run lighthouse` | Build de demo + preview + 3 execuções por página/perfil; relatórios em `lighthouse/reports` e medianas em `lighthouse/summary.md` |

Na primeira execução do Playwright pode ser preciso instalar o navegador: `npx playwright install chromium`.

Para rodar as suítes contra a versão publicada em vez de um build local, use `E2E_BASE_URL=https://nft-marketplace-davicastanha.vercel.app npm run test:e2e` (a suíte completa passa contra o deploy).

### Variáveis de ambiente

Os valores padrão já estão nos arquivos versionados `.env.development`, `.env.demo` e `.env.production`; nenhum serviço externo é necessário. Para sobrescrever localmente, crie `.env.local` (ignorado pelo git).

| Variável | dev / demo | production | Descrição |
| --- | --- | --- | --- |
| `VITE_ENABLE_MOCKS` | `true` | `false` | Ativa a camada MSW (REST e Socket.IO). Com `false`, o MSW nem entra no bundle |
| `VITE_API_URL` | `/api` | `/api` | Base das chamadas REST (Axios) |
| `VITE_SOCKET_URL` | vazio | vazio | Origem do Socket.IO; vazio significa a mesma origem |
| `VITE_MOCK_SCENARIO` | `default` | — | Cenário inicial da simulação (veja a tabela abaixo) |

## Dados de demonstração

| Usuário | E-mail | Senha |
| --- | --- | --- |
| Alice Martins (tem carteira principal e favoritos) | `alice@jungle.test` | `Jungle@123` |
| Bruno Costa (sem carteiras) | `bruno@jungle.test` | `Jungle@123` |

Cupons: `JUNGLE10` (10%), `GENESIS25` (25%), `EXPIRED20` (expirado). Qualquer outro código é inválido.

## Simulação (MSW)

Os dados ficam no navegador (localStorage) e sobrevivem ao refresh. O botão **Simulação**, no canto inferior esquerdo (builds com mocks), permite:

- trocar o cenário;
- restaurar os dados iniciais;
- alterar o preço ou esgotar uma edição (o evento chega pelo Socket.IO);
- confirmar ou recusar pedidos pendentes (cenário `order-pending`);
- expirar a sessão;
- derrubar a conexão em tempo real.

O cenário também pode ser escolhido pela URL, com `?scenario=<id>`, ou pela variável `VITE_MOCK_SCENARIO`.

| Cenário | O que simula |
| --- | --- |
| `default` | Respostas rápidas, sem falhas |
| `empty` | Catálogo sem resultados |
| `slow` | 2,5 s por resposta (skeletons) |
| `variable-latency` | Latência entre 200 ms e 1,6 s (semente fixa) |
| `out-of-order` | Buscas mais recentes respondem antes das anteriores |
| `flaky` | Catálogo e detalhe falham (503) até uma nova tentativa manual |
| `timeout` | A primeira busca do catálogo e do detalhe não responde (timeout de 10 s); a nova tentativa automática recupera |
| `server-error` | Catálogo e detalhe sempre 500 |
| `offline` | Falha de conexão em todas as chamadas |
| `session-expired` | Sessões expiram 30 s após o login |
| `favorites-fail` | Favoritar falha (rollback otimista) |
| `price-change-on-checkout` | O preço do primeiro item sobe logo após a cotação do checkout |
| `sold-out-on-checkout` | A edição do primeiro item esgota logo após a cotação do checkout |
| `order-timeout` | O pedido é criado, mas a resposta se perde; o reenvio recupera o mesmo pedido |
| `payment-rejected` | Pagamentos são recusados |
| `order-pending` | Pedidos ficam pendentes até serem resolvidos pelo painel |
| `wallet-rejected` | A carteira recusa a conexão |

### Como reproduzir os fluxos de falha

Use a URL com `?scenario=` uma vez (o cenário fica salvo) ou escolha no painel **Simulação**. Para voltar ao normal, selecione **Padrão**; para restaurar todos os dados, use **Restaurar dados iniciais**.

| Fluxo | Passos |
| --- | --- |
| Catálogo vazio, lento, com falha, timeout ou offline | Abra `/?scenario=empty`, `slow`, `flaky`, `timeout` ou `offline`. Em `flaky` e `offline`, use **Tentar novamente** depois de voltar ao cenário **Padrão** |
| Respostas fora de ordem | `/?scenario=out-of-order` e clique em vários filtros seguidos: a lista final corresponde ao último filtro |
| Sessão expirada | Entre, abra o perfil ou o checkout e use **Expirar sessão** no painel; a próxima ação leva ao login e, depois de entrar, você volta à mesma tela (o rascunho do checkout é preservado). Com `?scenario=session-expired`, a sessão expira sozinha em 30 s |
| Acesso sem permissão | Entre como Alice, conclua uma compra e copie a URL do pedido; entre como Bruno e abra essa URL (403, "Acesso negado") |
| Conflito de cadastro e validação | Cadastre-se com `alice@jungle.test`, ou salve o perfil com o usuário `bruno` |
| Cupom inválido ou expirado | No carrinho, aplique `NAOEXISTE` ou `EXPIRED20` |
| Falha ao favoritar | `?scenario=favorites-fail` e favorite um NFT: o estado volta ao anterior e um aviso aparece |
| Preço alterado ou edição esgotada | Com o NFT no carrinho, use **Mudar preço** ou **Esgotar edição** no painel (eventos via Socket.IO). Para o checkout, use `?scenario=price-change-on-checkout` ou `sold-out-on-checkout`, ou o painel com a revisão aberta: a confirmação exige aceitar os novos valores |
| Timeout após criar o pedido | `?scenario=order-timeout`, confirme a compra, aguarde o aviso (10 s) e clique em **Tentar novamente**: o mesmo pedido é recuperado |
| Pagamento recusado | `?scenario=payment-rejected`: o pedido termina recusado e os itens continuam no carrinho |
| Pedido pendente, desconexão e retomada | `?scenario=order-pending`, conclua a compra, use **Derrubar conexão Socket.IO** e recarregue a página: o pedido segue pendente, e o checkout bloqueia uma nova compra. Depois use **Confirmar** ou **Recusar pedidos pendentes** no painel |
| Carteira recusa a conexão | `?scenario=wallet-rejected` e clique em **Conectar carteira** no checkout |

Todos esses fluxos também estão automatizados nas suítes Playwright (veja a tabela de testes no [ARCHITECTURE.md](ARCHITECTURE.md#12-testes)).

## Estrutura

```
src/app          bootstrap, providers, router, layout, sessão e ponte de tempo real
src/routes       rotas (TanStack Router); _auth protege as rotas privadas
src/features     catalog, nft, cart, checkout, orders, auth, favorites, account
src/shared       contratos zod, cliente Axios, query keys, realtime, sessão, UI compartilhada
src/mocks        API simulada: banco, seed, cenários, handlers REST, Socket.IO, painel
tests/e2e        13 suítes Playwright + fixtures + baselines visuais
lighthouse       script, relatórios e medianas
scripts          extração do Figma e otimização das imagens
design           tokens e inventário extraídos do Figma
```

## Deploy

A Vercel usa o `vercel.json`: `npm ci`, `npm run build:demo`, saída `dist`, rewrite de SPA (acesso direto e refresh em qualquer rota) e cabeçalhos de cache. O worker do MSW (`/mockServiceWorker.js`) é servido sem cache.

## Figma

Os valores do layout foram extraídos pela API REST do Figma (`scripts/figma/extract.mjs`), e não medidos a olho:

- tokens de cores, tipografia, radius, sombras e espaçamentos: `design/tokens.md`;
- inventário de frames e IDs: `design/inventory.md`;
- ícones, convertidos em componentes por `scripts/figma/build-icons.mjs`;
- artes dos NFTs, convertidas para WebP por `scripts/assets/build-nft-images.mjs`.

O arquivo bruto do Figma e os PNGs das telas não são versionados. Desvios em relação ao layout estão documentados no [ARCHITECTURE.md](ARCHITECTURE.md#10-decisões-de-ux-e-desvios-do-figma).
