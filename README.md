# Kurio — Marketplace de NFTs

Solução do desafio Frontend da Jungle Gaming: marketplace de NFTs em **React + TypeScript**, seguindo o layout do Figma, com os fluxos de descoberta, compra e conta funcionando sobre uma **API simulada com MSW** (REST + Socket.IO).

- **Demonstração:** _URL da Vercel_
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

Requisitos: **Node 22+** e npm.

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
