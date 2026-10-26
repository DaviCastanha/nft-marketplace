import type { Wallet } from '@/shared/contracts/account'
import { CATEGORIES, NETWORKS, NETWORK_LABELS, type Category, type Image, type Network } from '@/shared/contracts/common'
import type { Edition, Review } from '@/shared/contracts/nft'
import { eth } from '@/shared/lib/money'
import type { DbState, NftRecord, UserRecord } from '@/mocks/db/types'
import { createRandom, type Random } from '@/mocks/lib/random'

export const SCHEMA_VERSION = 1
const SEED = 20261026
/** Fixed clock for fixtures, so listing order and "new" badges never drift. */
export const SEED_NOW = Date.parse('2026-10-20T12:00:00.000Z')
const HOUR = 3_600_000
const NFT_COUNT = 72

type Artwork = 'emerald' | 'nomad' | 'baron' | 'golden'
const ARTWORK_ALT: Record<Artwork, string> = {
  emerald: 'Macaco de pelo castanho com óculos redondos verdes e jaqueta college verde',
  nomad: 'Gorila grisalho com chapéu bucket verde-oliva e moletom lilás',
  baron: 'Macaco de pelo preto com blazer creme e gola alta verde',
  golden: 'Macaco de pelo dourado com fones de ouvido verdes e jaqueta creme',
}
const ARTWORK_COLLECTION: Record<Artwork, string> = {
  emerald: 'Kurio Apes',
  nomad: 'Nomad Society',
  baron: 'Baron Club',
  golden: 'Golden Frequencies',
}
const CREATORS = ['Nova Sato', 'Iris Moraes', 'Theo Lin', 'Maya Okafor'] as const
const IMAGE_WIDTHS = [160, 320, 640, 960]

export function artworkImage(artwork: Artwork, name: string): Image {
  return {
    src: `/nfts/${artwork}-640.webp`,
    srcSet: IMAGE_WIDTHS.map((w) => `/nfts/${artwork}-${w}.webp ${w}w`).join(', '),
    alt: `${name}: ${ARTWORK_ALT[artwork]}`,
    width: 960,
    height: 960,
  }
}

/** The first entries reproduce the cards in the Figma frames. */
const FIGMA_NFTS: Array<{ name: string; artwork: Artwork; price: string; compareAt?: string; rare?: boolean }> = [
  { name: 'Emerald Ape #042', artwork: 'emerald', price: '1.19', rare: true },
  { name: 'Sage Nomad #009', artwork: 'nomad', price: '1.69' },
  { name: 'Neon Vessel #552', artwork: 'baron', price: '1.99', compareAt: '2.29' },
  { name: 'Cosmic Bloom #118', artwork: 'nomad', price: '1.29' },
  { name: 'Violet Nomad #314', artwork: 'nomad', price: '1.39' },
  { name: 'Ivory Baron #088', artwork: 'baron', price: '1.79' },
  { name: 'Golden Beat #207', artwork: 'golden', price: '0.99' },
  { name: 'Golden Echo #071', artwork: 'golden', price: '0.69' },
  { name: 'Golden Signal #160', artwork: 'golden', price: '0.39' },
]

const ADJECTIVES = ['Amber', 'Cosmic', 'Velvet', 'Lunar', 'Copper', 'Silent', 'Wild', 'Solar', 'Misty', 'Royal', 'Neon', 'Rust']
const NOUNS: Record<Artwork, string[]> = {
  emerald: ['Ape', 'Monarch', 'Jade'],
  nomad: ['Nomad', 'Drifter', 'Bloom'],
  baron: ['Baron', 'Vessel', 'Regent'],
  golden: ['Beat', 'Signal', 'Echo'],
}
const ARTWORKS: Artwork[] = ['emerald', 'nomad', 'baron', 'golden']
const ATTRIBUTES: Record<Artwork, string[]> = {
  emerald: ['Óculos', 'Esmeralda', 'Jaqueta college'],
  nomad: ['Chapéu bucket', 'Moletom', 'Barba grisalha'],
  baron: ['Blazer', 'Gola alta', 'Brinco'],
  golden: ['Fones', 'Pelo dourado', 'Jaqueta bomber'],
}

const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/#/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

function buildEditions(random: Random, basePrice: string, rare: boolean, soldOut: boolean): Edition[] {
  const editions: Edition[] = []
  const add = (id: string, label: string, kind: Edition['kind'], supply: number | null, multiplier: number, maxPerOrder: number) => {
    const available = soldOut ? 0 : supply === null ? 999 : random.int(0, supply)
    editions.push({
      id,
      label,
      kind,
      supply,
      available,
      price: multiplier === 1 ? basePrice : Big2(Number(basePrice) * multiplier),
      maxPerOrder,
    })
  }
  if (rare || random.chance(0.5)) add('1-1', '1/1', 'unique', 1, 4.2, 1)
  if (random.chance(0.7)) add('1-10', '1/10', 'limited', 10, 1.6, 10)
  add('1-50', '1/50', 'limited', 50, 1, 10)
  if (random.chance(0.5)) add('open', 'ABERTA', 'open', null, 1, 10)
  // The base edition always has stock unless the whole NFT is sold out, so cards match the layout.
  const base = editions.find((e) => e.id === '1-50')
  if (base && !soldOut && base.available === 0) base.available = random.int(5, 50)
  return editions
}

/** Two-decimal ETH string from a float multiplier (fixtures only). */
function Big2(value: number) {
  return (Math.round(value * 100) / 100).toFixed(2)
}

const REVIEW_COMMENTS = [
  'Arte impecável, os detalhes em alta resolução impressionam.',
  'Entrega rápida na carteira e metadados completos.',
  'Uma das melhores peças da coleção até agora.',
  'O criador é muito ativo com a comunidade.',
  'Preço justo para a raridade da edição.',
  'Comprei a edição aberta e já quero a 1/10.',
]
const REVIEWERS = ['Lia M.', 'Rafa T.', 'Caio B.', 'Duda S.', 'Nina P.', 'Gus A.', 'Bia F.', 'Leo R.']

function buildReviews(random: Random, count: number, nftIndex: number): Review[] {
  return Array.from({ length: Math.min(count, 8) }, (_, i) => ({
    id: `rev_${nftIndex}_${i}`,
    author: random.pick(REVIEWERS),
    rating: random.int(4, 5),
    comment: random.pick(REVIEW_COMMENTS),
    createdAt: new Date(SEED_NOW - (i + 1) * 26 * HOUR).toISOString(),
  }))
}

function buildNft(random: Random, index: number, base: { name: string; artwork: Artwork; price: string; compareAt?: string; rare?: boolean }): NftRecord {
  const { name, artwork } = base
  const tokenNumber = name.split('#')[1] ?? String(index)
  const category: Category = index < FIGMA_NFTS.length ? 'arte-digital' : random.pick(CATEGORIES)
  const network: Network = index < FIGMA_NFTS.length ? 'ethereum' : random.pick(NETWORKS)
  const soldOut = index >= FIGMA_NFTS.length && random.chance(0.08)
  const rare = base.rare ?? random.chance(0.15)
  const editions = buildEditions(random, base.price, rare, soldOut)
  const creator = random.pick(CREATORS)
  const collection = ARTWORK_COLLECTION[artwork]
  const reviewsCount = index === 0 ? 19 : random.int(0, 32)
  const cheapest = cheapestAvailable(editions)
  const image = artworkImage(artwork, name)

  return {
    id: slugify(name),
    name,
    tokenId: `#${tokenNumber.padStart(4, '0')}`,
    collection,
    category,
    network,
    image,
    price: cheapest.price,
    compareAtPrice: base.compareAt ?? null,
    badge: rare ? 'rare' : null,
    rating: index === 0 ? 4.8 : Math.round((3.6 + random.next() * 1.4) * 10) / 10,
    reviewsCount,
    available: editions.reduce((sum, e) => sum + e.available, 0),
    listedAt: new Date(SEED_NOW - index * 7 * HOUR).toISOString(),
    version: 1,
    description: `Um colecionável digital finalizado à mão da coleção ${collection}, verificado na ${NETWORK_LABELS[network]}, com arte desbloqueável e acesso para colecionadores.`,
    story: [
      `${name} é uma obra digital finalizada à mão da coleção ${collection}. Cada atributo fica armazenado nos metadados do token e verificado na ${NETWORK_LABELS[network]}. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.`,
      `A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede. ${creator} recebe 5% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.`,
    ],
    creator,
    attributes: rare ? [...ATTRIBUTES[artwork].slice(0, 2), 'Raro'] : ATTRIBUTES[artwork],
    editions,
    gallery: [image, image, image, image],
    royaltiesPct: 5,
    contractAddress: `0x${random.hex(4).toUpperCase()}...${random.hex(4).toUpperCase()}`,
    contractStandard: network === 'solana' ? 'Metaplex' : 'ERC-721',
    networkNote: `Cunhado na ${NETWORK_LABELS[network]} com procedência imutável e metadados armazenados no IPFS.`,
    reviews: buildReviews(random, reviewsCount, index),
    popularity: index < 3 ? 100 - index : random.int(1, 95),
  }
}

export function cheapestAvailable(editions: Edition[]): Edition {
  const available = editions.filter((e) => e.available > 0)
  const pool = available.length > 0 ? available : editions
  return pool.reduce((min, e) => (eth.compare(e.price, min.price) < 0 ? e : min))
}

function generatedNfts(random: Random): Array<{ name: string; artwork: Artwork; price: string }> {
  const used = new Set(FIGMA_NFTS.map((n) => n.name))
  const list: Array<{ name: string; artwork: Artwork; price: string }> = []
  while (list.length < NFT_COUNT - FIGMA_NFTS.length) {
    const artwork = random.pick(ARTWORKS)
    const name = `${random.pick(ADJECTIVES)} ${random.pick(NOUNS[artwork])} #${String(random.int(1, 999)).padStart(3, '0')}`
    if (used.has(name)) continue
    used.add(name)
    // Skewed towards cheaper pieces, spanning the 0.02–12.30 ETH range from the layout.
    const price = Big2(0.02 + random.next() ** 2.4 * 12.28)
    list.push({ name, artwork, price })
  }
  return list
}

export const SEED_PASSWORD = 'Jungle@123'

const ALICE_WALLET: Wallet = {
  id: 'wal_alice_primary',
  slot: 'primary',
  displayName: 'Alice Martins',
  nickname: 'Cofre principal',
  network: 'ethereum',
  profileName: 'alice.colecao',
  address: '0xA91F3c2B7d8E4f6a0B1C2d3E4F5a6B7c8D9eE82C',
  secondaryAddress: '',
  provider: 'metamask',
  referralCode: 'KURIO-ALICE',
  email: 'alice@jungle.test',
  ensName: 'alice',
  ensSuffix: '.eth',
  updatedAt: new Date(SEED_NOW).toISOString(),
}

// PBKDF2-SHA256 (100k iterations) of SEED_PASSWORD, precomputed so seeding stays synchronous
// and does not delay the first render. Verified at login by mocks/lib/password.ts.
function buildUsers(): UserRecord[] {
  const createdAt = new Date(SEED_NOW - 30 * 24 * HOUR).toISOString()
  return [
    {
      id: 'usr_alice',
      email: 'alice@jungle.test',
      username: 'alice',
      displayName: 'Alice Martins',
      ensName: 'alice',
      ensSuffix: '.eth',
      walletNickname: 'Cofre principal',
      avatarUrl: null,
      password: { salt: '6b75726f2d616c6963652d73616c7421', hash: '13b778a79e2650a5f9bffd266e3735ccdd74bfc30caa9d55c647766970fd6f82' },
      createdAt,
    },
    {
      id: 'usr_bruno',
      email: 'bruno@jungle.test',
      username: 'bruno',
      displayName: 'Bruno Costa',
      ensName: 'bruno',
      ensSuffix: '.eth',
      walletNickname: 'Carteira do Bruno',
      avatarUrl: null,
      password: { salt: '6b75726f2d6272756e6f2d73616c7421', hash: '1cf8a6c1776ec1de9237fd495603a05a7b3cf3e353d172551d3cc60e6b915700' },
      createdAt,
    },
  ]
}

export function buildSeed(): DbState {
  const random = createRandom(SEED)
  const nfts = [...FIGMA_NFTS, ...generatedNfts(random)].map((base, index) => buildNft(random, index, base))
  return {
    schemaVersion: SCHEMA_VERSION,
    nfts,
    users: buildUsers(),
    sessions: [],
    favorites: { usr_alice: [nfts[1]!.id, nfts[5]!.id], usr_bruno: [] },
    carts: {},
    coupons: [
      { code: 'JUNGLE10', label: 'Desconto do lançamento', percentOff: 10, expiresAt: '2099-12-31T23:59:59.000Z' },
      { code: 'GENESIS25', label: 'Lançamento gênesis', percentOff: 25, expiresAt: '2099-12-31T23:59:59.000Z' },
      { code: 'EXPIRED20', label: 'Campanha encerrada', percentOff: 20, expiresAt: '2026-01-01T00:00:00.000Z' },
    ],
    quotes: {},
    orders: {},
    idempotency: {},
    wallets: { usr_alice: { primary: ALICE_WALLET, secondary: null }, usr_bruno: { primary: null, secondary: null } },
    walletSessions: {},
  }
}
