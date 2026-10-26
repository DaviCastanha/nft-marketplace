#!/usr/bin/env node
// Converts the Figma artwork fills (design/assets/fills, local only) into the
// responsive WebP set served from public/nfts (versioned). Run after `extract.mjs fills`.

import { mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const fills = join(root, 'design', 'assets', 'fills')
const out = join(root, 'public', 'nfts')

/** Figma imageRef → artwork slug used by the fixtures. */
const ARTWORKS = {
  '8459204731e6eba9d474cbc8ebc37071360d3ba5': 'emerald',
  '2986a7cb16d09de8970824d2dd58bf0bb021702c': 'nomad',
  '9df2ff42dd27ba657621c304557d1a855a4be6a5': 'baron',
  '87580f2def9af0ce13f4b6f6ce17bb2449bcfc16': 'golden',
}
const WIDTHS = [160, 320, 640, 960]

mkdirSync(out, { recursive: true })
for (const [ref, slug] of Object.entries(ARTWORKS)) {
  for (const width of WIDTHS) {
    const file = join(out, `${slug}-${width}.webp`)
    await sharp(join(fills, `${ref}.png`)).resize(width, width).webp({ quality: 78, effort: 6 }).toFile(file)
  }
  console.log(`✔ ${slug}: ${WIDTHS.join(', ')}`)
}
