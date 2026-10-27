# Arquitetura — Kurio NFT Marketplace

Este documento descreve como a aplicação está organizada, os contratos entre interface e API simulada, as políticas de sessão, carrinho, cache e tempo real, e as decisões e limitações conhecidas.

## 1. Visão geral

```
src/
  main.tsx            bootstrap: inicia a camada de rede (MSW no build de demo) em paralelo com o app
  app/                providers, QueryClient, router, layout (header, footer, navegação mobile),
                      ciclo de vida da sessão e ponte Socket.IO
  routes/             rotas file-based do TanStack Router (_auth = layout que protege as rotas privadas)
  features/           catalog, nft, cart, checkout, orders, auth, favorites, account
  shared/
    contracts/        schemas zod: única fonte de tipos para transporte, cache, UI e mocks
    api/              cliente Axios, normalização de erros (ApiError), request validado, query keys
    realtime/         socket, dispatcher idempotente de eventos, status da conexão
    session/          store da sessão (useSyncExternalStore)
    components/       shadcn/ui adaptado, ícones gerados do Figma, componentes compartilhados
    lib/              valores em ETH (big.js), formatação, storage seguro, utilitários
  mocks/              API simulada (MSW): banco, seed, cenários, handlers REST, servidor Socket.IO,
                      plano de controle e painel de simulação
tests/e2e/            suítes Playwright, fixtures e baselines visuais
lighthouse/           script de auditoria, relatórios e medianas
scripts/              extração do Figma (tokens, inventário, ícones) e otimização das imagens
design/               tokens e inventário extraídos do Figma (PNGs e JSON bruto ficam fora do git)
```

**Regra central:** componentes, hooks e o cliente Axios não conhecem os mocks. Somente `main.tsx` decide, por `VITE_ENABLE_MOCKS`, importar `mocks/browser` dinamicamente. O build de produção sem mocks não inclui nenhum código do MSW (verificado no `dist`).

### Fluxo de dados

```
UI (React) ── TanStack Query ── Axios (request validado com zod) ── /api/* ── MSW (handlers) ── banco simulado
     ▲                                                                                   │
     └──── dispatcher idempotente ◄── socket.io-client ◄── servidor Socket.IO simulado ◄─┘ (eventos)
```

Toda mudança de dados simulados passa pelas mesmas funções de domínio do mock (`mocks/domain`). Por isso a resposta REST e o evento correspondente nunca divergem. O painel de simulação e os testes só alteram dados por endpoints HTTP de controle (`/api/__mock/*`), e as mudanças chegam à interface pelo REST e pelo Socket.IO, nunca por setters ou pelo cache.

## 2. Contratos REST

Todos os schemas estão em `src/shared/contracts`. Cada resposta é validada com o schema (`shared/api/request.ts`) antes de chegar ao cache. Valores em ETH trafegam como **strings decimais** e são calculados com `big.js`; quantidades são inteiras.

| Recurso | Método e rota | Corpo / parâmetros | Resposta |
| --- | --- | --- | --- |
| Sessão | `POST /api/auth/signup` | `{ username, email, password, confirmPassword }` | `201 Session` · `409 EMAIL_TAKEN/USERNAME_TAKEN` · `422` |
| | `POST /api/auth/login` | `{ email, password }` | `Session` · `401 INVALID_CREDENTIALS` |
| | `GET /api/auth/session` | Bearer | `Session` · `401 SESSION_EXPIRED` |
| | `POST /api/auth/logout` | Bearer | `204` |
| NFTs | `GET /api/nfts` | `q, category*, network*, minPrice, maxPrice, tab, sort, page` | `{ items, page, pageSize, total, totalPages, facets }` |
| | `GET /api/nfts/featured` | — | `{ hero, spotlight }` |
| | `GET /api/nfts/:id` | — | `NftDetail` · `404 NOT_FOUND` |
| | `GET /api/nfts/:id/related` | — | `{ items }` |
| Favoritos | `GET /api/favorites` | Bearer | `{ items }` |
| | `PUT/DELETE /api/favorites/:nftId` | Bearer (idempotente) | `204` |
| Carrinho | `GET /api/cart` | Bearer ou `X-Cart-Id` | `Cart` |
| | `POST /api/cart/items` | `{ nftId, editionId, quantity }` | `201 Cart` · `409 EDITION_UNAVAILABLE/QUANTITY_LIMIT` |
| | `PATCH /api/cart/items/:itemId` | `{ quantity }` | `Cart` |
| | `DELETE /api/cart/items/:itemId` | — | `Cart` |
| | `POST/DELETE /api/cart/coupon` | `{ code }` | `Cart` · `422 COUPON_INVALID/COUPON_EXPIRED` |
| | `POST /api/cart/merge` | Bearer + `X-Cart-Id` | `Cart` (carrinho do visitante mesclado no do usuário) |
| Cotação | `POST /api/quote` | `{ network, purpose: 'cart' \| 'checkout' }` | `Quote` (linhas, cupom, subtotal, desconto, taxa, total, `purchasable`, `expiresAt`) |
| Pedidos | `POST /api/orders` | header `Idempotency-Key`; `{ quoteId, walletSessionId, buyer }` | `201 Order` (novo) · `200 Order` (mesma chave e corpo) · `409 IDEMPOTENCY_CONFLICT / QUOTE_STALE / OUT_OF_STOCK / WALLET_DISCONNECTED` |
| | `GET /api/orders/:id` | Bearer | `Order` · `404` (inclui pedidos de outro usuário) |
| Perfil | `GET/PUT /api/profile` | `ProfileInput` | `User` · `409` · `422` |
| | `POST/DELETE /api/profile/avatar` | `{ dataUrl }` (redimensionado no cliente) | `User` |
| | `POST /api/profile/password` | `{ currentPassword, newPassword, confirmPassword }` | `204` · `422` |
| Carteiras | `GET /api/wallets` | Bearer | `{ primary, secondary }` |
| | `PUT /api/wallets/:slot` | `WalletInput` (`primary` \| `secondary`) | `{ primary, secondary }` · `409` · `422` |
| | `POST /api/wallet-sessions` | `{ walletId, network }` | `201 WalletSession` · `409 WALLET_REJECTED` |
| | `DELETE /api/wallet-sessions/:id` | — | `204` |

**Erros:** o corpo é sempre `{ code, message, fields?, details? }`. O interceptor do Axios converte qualquer falha (HTTP, rede, timeout, cancelamento) em `ApiError`, que é o tipo de erro registrado globalmente no TanStack Query. Os códigos cobrem validação (`VALIDATION_ERROR` com `fields`), sessão inválida (`UNAUTHORIZED`, `SESSION_EXPIRED`), falta de permissão (pedidos de outro usuário respondem 404 para não vazar existência), recurso inexistente, conflitos de disponibilidade e falhas transitórias (`SERVER_ERROR`, `NETWORK_ERROR`, `TIMEOUT`).

**Timeout:** 10 s por requisição, implementado com timer e `AbortController` em vez do timeout nativo do XHR. O comportamento é o mesmo, mas o relógio da página o controla, então o Playwright consegue reproduzir o cenário de timeout com `page.clock`.

## 3. Eventos em tempo real

Envelope comum (`shared/contracts/events.ts`):

```ts
{ eventId, type, resource: { type, id }, version, occurredAt, payload }
```

| Evento | Payload | Efeito no cliente |
| --- | --- | --- |
| `nft.updated` | preço e disponibilidade atuais, edições e `changes[]` (valores anteriores e novos por edição) | atualiza detalhe, listas, destaques, relacionados e favoritos no cache; refaz carrinho e cotações; anuncia a mudança (aria-live) e mostra toast quando o NFT está no carrinho |
| `order.updated` | snapshot completo do pedido | substitui o pedido em cache; a página do pedido passa para confirmado ou recusado; o carrinho é refeito quando o pedido é confirmado |

**Idempotência e ordenação:** o dispatcher (`shared/realtime/dispatcher.ts`) descarta `eventId` já processado (LRU de 500) e qualquer evento com `version` menor ou igual à versão conhecida, seja em memória, seja no recurso em cache. Duplicatas e eventos antigos nunca regridem o estado nem repetem efeitos como toasts e anúncios.

**Ciclo de vida:** existe um socket por sessão (o token vai no `auth` do CONNECT). Na troca de token (login, logout, troca de usuário), o socket anterior é desconectado e seus listeners removidos, e um novo dispatcher é criado. O servidor simulado entrega `order.updated` somente às conexões autenticadas como dono do pedido. Assim, eventos de uma sessão anterior não alcançam outro usuário.

**Reconciliação REST ↔ Socket.IO:** depois de uma reconexão (não na primeira conexão), o cliente invalida o catálogo ativo, o carrinho, as cotações e os pedidos do usuário. Tudo o que foi perdido enquanto a conexão estava fora é buscado de novo por REST. A página de pedido pendente faz polling (3 s) **somente enquanto o socket está desconectado**. Ao recarregar, o pedido é recuperado por `GET /orders/:id` a partir da URL, e o checkout aponta para o pedido pendente (`pendingOrder` em localStorage) em vez de permitir uma segunda compra.

## 4. Sessão

- Login e cadastro retornam `{ token, expiresAt, user }`. O token fica em `localStorage`, para que a sessão sobreviva ao refresh, e é revalidado uma vez por carregamento (`GET /auth/session`, no `beforeLoad` da rota raiz). Um 401 encerra a sessão; uma falha transitória a mantém (refresh offline não desloga).
- **Trade-off documentado:** em produção o token iria em cookie `httpOnly`. O MSW intercepta no navegador e não oferece essa garantia, por isso a escolha foi localStorage, com sessão expirável e revalidada.
- **Expiração durante a navegação:** qualquer resposta `401 SESSION_EXPIRED/UNAUTHORIZED` com token presente chama `sessionStore.end('expired')`. O `SessionLifecycle` cancela e remove todo o cache privado (`['user', ...]`), avisa o usuário e, se a rota atual é privada, redireciona para `/login?redirect=<url atual>&reason=expired`. Depois do login, o usuário volta para a mesma URL.
- **Expiração durante o checkout:** o rascunho do checkout fica em `sessionStorage`, por usuário, e é restaurado ao voltar.
- **Logout e troca de usuário:** remove todas as queries `['user', userId, ...]`, desconecta o socket, gera um novo `X-Cart-Id` de visitante e volta ao início. Nenhuma query privada é compartilhada entre usuários, porque todas as chaves privadas levam o `userId`.
- **Senhas:** o mock guarda apenas hash PBKDF2-SHA256 (100k iterações, WebCrypto) com salt. Os hashes dos usuários de exemplo são pré-computados para não atrasar o primeiro carregamento.
- **Rotas privadas:** o layout `_auth` (checkout, pedidos, perfil, carteiras, favoritos) redireciona para o login com `redirect` validado. Só são aceitos caminhos da mesma origem, o que evita open redirect.

## 5. Carrinho, cotação e pedido

- O **visitante** é identificado por `X-Cart-Id` (UUID em localStorage). No login, `POST /cart/merge` soma os itens ao carrinho do usuário, respeitando o limite e a disponibilidade, e apaga o carrinho do visitante.
- A **disponibilidade é por NFT e edição**. A quantidade fica limitada a `min(disponível, máximo por pedido)`. Reduzir uma quantidade é sempre permitido; aumentar é revalidado pela API.
- A **cotação** (`POST /quote`) é a referência de valores: o resumo exibe exatamente `subtotal`, `discount`, `networkFee` e `total` da API, sem cálculo no cliente. A chave da query inclui a versão do carrinho, então qualquer mudança gera uma nova cotação. As linhas indicam `price_changed` (com o preço anterior), `insufficient` ou `sold_out`, e problemas bloqueiam a finalização.
- **Revisão:** o checkout pede uma cotação `purpose: 'checkout'`. O diálogo de revisão compara a cotação aberta com a atual. Se preço, estoque, cupom ou total mudaram (por evento ou por `409 QUOTE_STALE`), ele lista as diferenças e exige um "Revisei os novos valores" antes de habilitar o pagamento.
- **Pedido idempotente:** a chave `Idempotency-Key` é gerada por tentativa e salva em `sessionStorage` com a impressão do payload. Mesmo payload reutiliza a mesma chave; payload diferente gera chave nova. O botão fica desabilitado durante o envio, o que evita cliques repetidos. Se a resposta se perde por timeout, "Tentar novamente" reenvia exatamente a mesma tentativa, e a API devolve o mesmo pedido (200). Mesma chave com corpo diferente resulta em `409 IDEMPOTENCY_CONFLICT`.
- **Estados:** `pending` → `confirmed | rejected` (terminais). O estoque é reservado na criação e liberado na recusa. Na confirmação, o mock remove do carrinho **apenas** os itens e quantidades comprados; o que foi adicionado depois permanece. O recibo é renderizado a partir do snapshot gravado no pedido, então mudanças posteriores no catálogo não alteram seus valores.
- **Carteiras:** conexão simulada (`POST /wallet-sessions`), com prompt, aprovação, recusa (cenário `wallet-rejected`) e desconexão. Trocar a rede ou a carteira derruba a conexão, e a API recusa um pedido cuja rede difere da cotação.

## 6. Estratégia de cache (TanStack Query)

| Dados | Chave | Política |
| --- | --- | --- |
| Lista do catálogo | `['catalog','list', search]` | `staleTime` 30 s, `placeholderData: keepPreviousData` (a lista anterior aparece esmaecida com `aria-busy`), `signal` repassado ao Axios para cancelar a busca superada |
| Destaques e relacionados | `['catalog','featured' \| 'related', id]` | `staleTime` 5 min |
| Detalhe | `['catalog','detail', id]` | `staleTime` 30 s; prefetch no loader da rota, sem bloquear a navegação (skeleton) |
| Carrinho | `['user', id, 'cart']` ou `['guest', cartId, 'cart']` | `staleTime` 0, refetch ao focar; mutations escrevem a resposta (carrinho completo) direto no cache |
| Cotação | `['user'\|'guest', …, 'quote', network, cartVersion]` | `staleTime` 0, refetch ao focar |
| Favoritos, perfil, carteiras, pedidos | `['user', id, …]` | padrão (30 s); removidos no logout ou na expiração |

- **Retries:** queries até 2 vezes, apenas para rede, timeout e 5xx, com backoff exponencial (500 ms, 1 s). Mutations não têm retry automático; o pedido usa o reenvio idempotente explícito.
- **Respostas fora de ordem:** cada combinação de filtros tem sua própria entrada no cache e a query superada é cancelada. Uma resposta atrasada nunca sobrescreve a busca atual (coberto pelo cenário `out-of-order`).
- **Atualização otimista:** em favoritos, `onMutate` guarda o snapshot e atualiza a lista; `onError` restaura o snapshot, mostra toast e anuncia; `onSettled` invalida a lista. Os botões usam `aria-pressed` com nome constante.
- **Invalidação por evento:** veja a seção 3. O cache é atualizado no lugar quando o evento traz os dados (`setQueryData`) e invalidado quando o valor depende de cálculo da API (carrinho e cotação).

## 7. Estado na URL (catálogo)

Busca, filtros, aba, ordenação e página vivem nos search params, validados por `catalogSearchSchema` (zod). Valores inválidos são descartados e não quebram a URL. Os defaults são removidos (`stripSearchParams`) e as listas usam formato legível (`?category=arte-digital,musica&network=ethereum&page=2`). Qualquer mudança de filtro zera a página. Cada mudança cria uma entrada no histórico, então voltar e avançar restauram o estado, e um refresh reconstrói a tela a partir da URL.

## 8. Mocking com MSW

- **Ativação:** `VITE_ENABLE_MOCKS=true` nos modos `development` e `demo` (o build publicado). O modo `production` exclui os mocks do bundle.
- **Banco simulado:** estado tipado e persistido em `localStorage`, com chave versionada (`kurio:mock-db:v1`). O seed é determinístico (PRNG com semente fixa e relógio fixo nos fixtures): 72 NFTs, sendo os 9 primeiros os mesmos do Figma, 9 categorias, 3 redes, preços de 0,02 a 12,30 ETH e edições esgotadas; 2 usuários; cupons; a carteira da Alice. O reset (`POST /api/__mock/reset` ou o painel) restaura o seed integralmente.
- **Cenários** (`mocks/scenarios/definitions.ts`), selecionáveis por `?scenario=`, pelo painel "Simulação" ou por `VITE_MOCK_SCENARIO`, e persistidos: `default`, `empty`, `slow`, `variable-latency` (latência com semente), `out-of-order`, `flaky` (503 até nova tentativa manual), `server-error`, `offline`, `session-expired` (sessão de 30 s), `favorites-fail`, `price-change-on-checkout`, `sold-out-on-checkout`, `order-timeout`, `payment-rejected`, `order-pending`, `wallet-rejected`. A latência e as falhas são aplicadas por rota por um middleware único (`simulateNetwork`), e as sequências são reiniciadas a cada troca de cenário, o que garante reprodutibilidade.
- **Plano de controle** (`/api/__mock/*`, usado pelo painel e pelo Playwright): estado e cenários, reset, troca de cenário, expirar sessões, alterar preço ou estoque de um NFT, resolver pedido pendente, derrubar o socket, repetir o último evento (duplicado ou antigo).

### Transporte Socket.IO e limitações

O servidor de eventos usa `ws.link` do MSW com `@mswjs/socket.io-binding` (`toSocketIo`), consumido pelo `socket.io-client` real com `transports: ['websocket']`. Limitações e como foram tratadas:

- O MSW remove o prefixo `/socket.io/` antes de casar a URL, então o link aponta para a origem. Como isso também casaria o WebSocket do HMR do Vite, conexões que não são Socket.IO são repassadas ao servidor real.
- O binding responde ao handshake, mas **não envia ping**. O mock envia `2` a cada 25 s; sem isso o cliente derrubaria a conexão após `pingInterval + pingTimeout`.
- O binding ignora o payload do CONNECT. O token é lido do pacote bruto `40{...}`, e o filtro por usuário é aplicado no próprio handler.
- Não há namespaces, rooms nem acks (somente o namespace padrão e eventos de texto). A entrega por usuário é feita pelo filtro do handler.
- O `engine.io-client` captura `globalThis.WebSocket` ao ser avaliado. Por isso `socket.io-client` é importado dinamicamente pela ponte de tempo real, somente depois que a camada de rede está pronta.
- O WebSocket é interceptado no próprio navegador (não pelo service worker), então os eventos funcionam igualmente em `vite dev`, `vite preview` e na Vercel.

**Inicialização:** a interface renderiza assim que o código do app chega. Requisições HTTP e o socket aguardam `networkReady` (resolvida após o `worker.start()`), então nenhuma requisição escapa dos mocks e o skeleton e o hero aparecem antes.

## 9. Interface, responsividade e acessibilidade

- **Tokens do Figma** extraídos pela API REST do Figma (`scripts/figma`): cores e estilos nomeados, tipografia (Roboto Mono), radius, sombras e espaçamentos, aplicados no `@theme` do Tailwind 4. O shadcn/ui foi adaptado a esses tokens (botões com raio de 3 px, primária âmbar com texto escuro, inputs com borda `#3f2319`).
- Os ícones são gerados dos SVGs exportados do Figma, com `currentColor`, sem clip/mask (evita IDs duplicados) e com `aria-hidden`. As artes dos NFTs saem dos fills do Figma, convertidas para WebP em 4 larguras com `srcset`/`sizes`, `width`/`height` explícitos e prioridade no LCP.
- **Breakpoints:** desktop a partir de `lg` (1024 px), com header e footer do Figma. Abaixo disso, o layout mobile dos frames: busca e filtros em sheet, cards com o coração sobre a arte, barra inferior de navegação e barras de ação fixas no detalhe, carrinho e pagamento. Verificado em 390, 768 e 1440 px.
- **Skeletons com shimmer**, com as mesmas dimensões do conteúdo, desligados em `prefers-reduced-motion`. Todas as transições respeitam movimento reduzido.
- **Acessibilidade:**
  - skip link e foco visível;
  - Radix para foco em diálogos e sheets, com retorno do foco ao gatilho;
  - labels em todos os campos (visíveis ou `sr-only` onde o Figma só mostra placeholder);
  - erros associados por `aria-describedby` e `aria-invalid`, com foco no primeiro campo inválido;
  - região `aria-live` para mutations, resultados da busca e mudanças em tempo real;
  - estados que não dependem só de cor (edição esgotada riscada com rótulo, avisos com texto e ícone);
  - toggles com `aria-pressed` e nome constante;
  - nome acessível contendo o texto visível (WCAG 2.5.3);
  - `dark` fixo por classe, de modo que a renderização não depende do esquema de cores do sistema.
  - O axe não acusa violações sérias ou críticas em início, detalhe, carrinho, pagamento e carteiras (suíte 11).

## 10. Decisões de UX e desvios do Figma

| Ponto | Decisão |
| --- | --- |
| Rótulos "Contrato" e "Direitos autorais" no detalhe | No Figma os conteúdos estão trocados. Aqui "Contrato" mostra endereço e padrão, e "Direitos autorais" mostra o percentual. |
| Login e cadastro | Modal sobre o início no desktop (como no Figma) e tela cheia no mobile (como nos frames mobile). As rotas `/login` e `/signup` funcionam em acesso direto. |
| Confirmação de pedido | No Figma é um modal sobre o pagamento. Aqui é a rota `/orders/$id`, com o mesmo cartão, recuperável após refresh e com estados pendente e recusado. |
| Revisão antes do envio | Diálogo de revisão adicional (o Figma não desenha o passo), necessário para revalidar valores e exigir nova confirmação. |
| Carteira no pagamento | O formulário do Figma mistura dados do comprador e da carteira. Os campos da carteira vêm da carteira cadastrada selecionada (somente leitura), e "Usar outra carteira?" alterna para a secundária. A seção "Carteira e rede" lista as carteiras cadastradas (como no frame mobile) com a conexão simulada. |
| Perfil | Dados, avatar e senha são salvos pelo único botão "Salvar", como no layout. A senha só muda se os campos forem preenchidos. |
| Itens fora do escopo | Criadores, Aprenda, Atividade, Ofertas, Arquivos, Suporte, Diário da Cunhagem, newsletter, login social, recuperação de senha e leitor de QR informam que não estão disponíveis na demonstração, em vez de simular sucesso. Links de compartilhamento abrem os serviços reais. "Ver no Etherscan" abre um explorador simulado interno, porque as transações não existem numa rede real. |
| Busca no desktop | Pelo ícone do header (diálogo), já que o Figma não tem campo de busca na listagem. No mobile, pela barra do topo. |
| Ordenação no mobile | Dentro do sheet de filtros (o frame mobile não mostra ordenação). |
| Paginação | Janela de quatro números e setas, como no Figma ("1 2 3 4 >"). |
| Disponibilidade no detalhe | Linha "Disponíveis: X de Y" adicionada, porque disponibilidade por edição é requisito. |
| Contagens e preço máximo dos filtros | Vêm da API (dados simulados), portanto diferem dos números ilustrativos do Figma. O seed fixa o máximo em 12,30 ETH, como no rótulo do layout. |
| Edição padrão | 1/50 quando disponível (como no Figma) e fixada no carregamento: eventos em tempo real nunca trocam a edição que o usuário está vendo. |
| Assets | As quatro artes do Figma são reutilizadas nos 72 NFTs (o layout também repete as artes). Duas imagens de outro projeto presentes no arquivo do Figma não foram usadas. Três elementos não renderizaram no export do Figma (entre eles um logo PayPal não usado nas telas). O envelope "Thank you" da confirmação e as setas da paginação foram desenhados como SVG inline equivalente. |
| Fonte | Roboto Mono (Google Fonts, OFL), auto-hospedada, apenas o subset latino, com preload e fallback de métricas compatíveis. |

## 11. Performance (Lighthouse)

Medianas de 3 execuções por página e perfil, no build de demonstração (bundle de produção + MSW, cenário padrão). Detalhes em `lighthouse/summary.md`.

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Início | Mobile | 74 | 100 | 100 | 100 | 4,99 s | 0 | 153 ms |
| Início | Desktop | 99 | 100 | 100 | 100 | 0,98 s | 0 | 0 ms |
| Detalhe | Mobile | 78 | 100 | 100 | 100 | 4,51 s | 0 | 112 ms |
| Detalhe | Desktop | 99 | 100 | 100 | 100 | 0,96 s | 0 | 0 ms |

**Abaixo da meta: Performance mobile (74 e 78, meta ≥ 90).** A causa é o LCP. No perfil mobile (CPU 4× mais lenta, rede 4G lenta simulada), o elemento LCP é a primeira arte do catálogo ou do detalhe, que depende de dados da API. Na demo, a API é o MSW, que precisa estar ativo antes de qualquer requisição. A cadeia crítica é: entrada → runtime do MSW (≈175 KB gzip; ≈0,7 s de avaliação de script no perfil mobile) → registro do service worker → requisição → render → imagem. A imagem em si já chega pré-carregada (atraso de carregamento ≈ 10 ms); o que pesa é a espera pela camada simulada, e esse custo não existiria com um backend real (o build `production` não contém o MSW).

Otimizações feitas e mantidas por medição:

- **Renderizar antes do MSW:** a UI aparece enquanto as requisições aguardam a camada de rede.
- **Preloads:** `modulepreload` do chunk do app e preload da imagem LCP com `imagesrcset`/`imagesizes` iguais aos do elemento.
- **Divisão de código:** rotas de entrada no chunk principal; `socket.io-client` fora do caminho crítico.
- **Fonte:** auto-hospedada (subset latino) com preload e fallback de métricas.
- **CLS:** conteúdo principal com altura mínima no desktop. O CLS 0,23 vinha do rodapé empurrado pelo conteúdo.
- **SEO:** `robots.txt` válido.

Uma variante testada e **descartada**: fazer `modulepreload` também do MSW piorou o FCP mobile em ≈0,5 s, porque compete por banda com o primeiro render.

A auditoria carrega a entrega completa (imagens, fonte, MSW, Socket.IO, painel de simulação), sem simplificações exclusivas para a pontuação.

## 12. Testes

Playwright com projetos Chromium **desktop** (1440×900) e **mobile** (Pixel 7, 390×844), contra o build de demonstração (`build:demo` + `preview`). Cada teste usa um contexto novo, com banco reiniciado a partir do seed. As fixtures esperam o worker do MSW (`html[data-mocks=ready]`) e controlam os mocks somente pelo plano de controle HTTP executado dentro da página, sem tocar no estado da interface.

| Suíte | Cobertura |
| --- | --- |
| 01 | busca, filtros combinados, ordenação, paginação, reinício da página, histórico, refresh, respostas fora de ordem, vazio |
| 02 | acesso direto, refresh, NFT inexistente, edição esgotada (inclusive ao vivo) e limite de quantidade |
| 03 | cadastro (validação e conflito), login com retorno, expiração durante a navegação, logout e troca de usuário sem vazamento |
| 04 | favoritos otimistas, persistência, falha com rollback, visitante redirecionado |
| 05 | quantidades, remoção, cupons (inválido, expirado, válido), persistência após refresh, mescla no login, limite por pedido |
| 06 | compra completa até o recibo; recibo imutável; remoção parcial do carrinho |
| 07 | pagamento recusado, clique repetido (um único POST), timeout com recuperação pela mesma chave (`page.clock`) |
| 08 | perfil (validação, conflito, persistência), avatar, senha, carteiras principal e secundária com erros |
| 09 | preço alterado com o carrinho aberto, cotação desatualizada bloqueada (evento e `QUOTE_STALE`), edição esgotada na revisão |
| 10 | eventos duplicados e antigos, reconexão com reconciliação, pedido pendente retomado após refresh, isolamento de pedidos |
| 11 | teclado (skip link, card), foco de diálogo, erros associados, axe |
| 12 | skeletons em rede lenta, falha com nova tentativa, offline e retomada |
| 13 | regressão visual de início, detalhe, carrinho e pagamento (desktop e mobile) |

As baselines visuais foram geradas no Windows (sufixo `win32`). Em outra plataforma, gere as baselines locais com `npm run test:e2e:update -- 13-visual`.

## 13. Limitações conhecidas

- O token de sessão fica em localStorage (justificado na seção 4).
- O socket simulado não tem namespaces, rooms nem acks (seção 8).
- Os dados simulados ficam no navegador de cada visitante: cada pessoa tem o seu banco, e o reset do painel restaura o seed.
- A performance mobile está abaixo de 90 pelo custo da camada simulada (seção 11).
- O PNG das telas e o JSON bruto do Figma não são versionados (o arquivo pertence à Jungle). Os tokens e o inventário extraídos, sim.
