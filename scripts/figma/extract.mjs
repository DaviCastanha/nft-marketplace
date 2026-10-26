#!/usr/bin/env node
// Figma extraction for the design handoff. Heavy (Tier 1) endpoints have a tiny
// monthly quota on Starter/View seats, so every Tier 1 call is guarded and logged,
// and everything derivable is computed locally from the saved file JSON.
//
// Usage:
//   node scripts/figma/extract.mjs check <figma-url-or-key>   light: validates token + access, stores the key
//   node scripts/figma/extract.mjs file                       TIER 1: saves design/figma-file.json (once)
//   node scripts/figma/extract.mjs fills                      light: downloads image fills to design/assets/fills
//   node scripts/figma/extract.mjs inventory                  local: design/inventory.md + design/svg-ids.json
//   node scripts/figma/extract.mjs svgs                       TIER 1: exports svg-ids in a single batch
//   node scripts/figma/extract.mjs tokens                     local: design/tokens.md
//
// The token is read from FIGMA_TOKEN_FILE, ./.figma-token or ../.figma-token (gitignored) and is never printed.

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const designDir = join(root, 'design')
const paths = {
  key: join(designDir, '.figma-key'),
  file: join(designDir, 'figma-file.json'),
  callLog: join(designDir, 'figma-calls.log'),
  fills: join(designDir, 'assets', 'fills'),
  svg: join(designDir, 'assets', 'svg'),
  svgIds: join(designDir, 'svg-ids.json'),
  inventory: join(designDir, 'inventory.md'),
  tokens: join(designDir, 'tokens.md'),
}
const API = 'https://api.figma.com'
const ICON_MAX_SIZE = 64
const SVG_BATCH_LIMIT = 200

function readToken() {
  const candidates = [process.env.FIGMA_TOKEN_FILE, join(root, '.figma-token'), resolve(root, '..', '.figma-token')]
  const tokenPath = candidates.find((p) => p && existsSync(p))
  if (!tokenPath) fail('Token file not found (.figma-token in the project root or its parent)')
  const token = readFileSync(tokenPath, 'utf8').split(/\r?\n/)[0]?.trim()
  if (!token) fail(`Token file ${tokenPath} is empty`)
  return token
}

function readKey() {
  if (!existsSync(paths.key)) fail('No file key stored yet. Run `check <figma-url>` first.')
  return readFileSync(paths.key, 'utf8').trim()
}

function parseKey(input) {
  const match = /figma\.com\/(?:design|file|proto)\/([A-Za-z0-9]+)/.exec(input)
  return match?.[1] ?? input
}

function fail(message) {
  console.error(`✖ ${message}`)
  process.exit(1)
}

async function api(path, { tier }) {
  const res = await fetch(API + path, { headers: { 'X-Figma-Token': readToken() } })
  if (tier === 1) {
    appendFileSync(paths.callLog, `${new Date().toISOString()} ${res.status} GET ${path.split('?')[0]}\n`)
  }
  if (res.status === 429) {
    const retry = res.headers.get('retry-after')
    const type = res.headers.get('x-figma-rate-limit-type')
    fail(`Rate limited (type: ${type ?? '?'}, retry-after: ${retry ?? '?'}s). Do not retry blindly.`)
  }
  if (!res.ok) {
    const body = await res.text()
    fail(`${res.status} on ${path.split('?')[0]}: ${body.slice(0, 300)}`)
  }
  return res.json()
}

async function download(url, dest) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} downloading ${dest}`)
  const type = res.headers.get('content-type') ?? ''
  const ext = type.includes('svg') ? 'svg' : type.includes('png') ? 'png' : type.includes('gif') ? 'gif' : type.includes('webp') ? 'webp' : 'jpg'
  const file = dest.endsWith('.svg') ? dest : `${dest}.${ext}`
  writeFileSync(file, Buffer.from(await res.arrayBuffer()))
  return file
}

function loadFile() {
  if (!existsSync(paths.file)) fail('design/figma-file.json missing. Run `file` first.')
  return JSON.parse(readFileSync(paths.file, 'utf8'))
}

function* walk(node, parents = []) {
  yield [node, parents]
  for (const child of node.children ?? []) yield* walk(child, [...parents, node])
}

const VECTOR_TYPES = new Set(['VECTOR', 'BOOLEAN_OPERATION', 'ELLIPSE', 'RECTANGLE', 'LINE', 'STAR', 'POLYGON', 'REGULAR_POLYGON', 'GROUP', 'FRAME', 'INSTANCE', 'COMPONENT'])
const isPureVector = (node) => {
  for (const [n] of walk(node)) {
    if (!VECTOR_TYPES.has(n.type) || (n.fills ?? []).some((f) => f.type === 'IMAGE')) return false
  }
  // A lone rectangle/ellipse is a shape (divider, dot), not an icon.
  return !['RECTANGLE', 'ELLIPSE', 'LINE'].includes(node.type)
}

const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'node'
const hex = ({ r, g, b }, a = 1) => {
  const h = [r, g, b].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')
  return a < 1 ? `#${h}${Math.round(a * 255).toString(16).padStart(2, '0')}` : `#${h}`
}
const size = (n) => (n.absoluteBoundingBox ? `${Math.round(n.absoluteBoundingBox.width)}×${Math.round(n.absoluteBoundingBox.height)}` : '?')
const tally = (map, key, sample) => {
  const entry = map.get(key) ?? { count: 0, samples: new Set() }
  entry.count++
  if (sample && entry.samples.size < 3) entry.samples.add(sample)
  map.set(key, entry)
}
const sorted = (map) => [...map.entries()].sort((a, b) => b[1].count - a[1].count)

const commands = {
  async check(input) {
    if (!input) fail('Pass the Figma URL or file key.')
    const key = parseKey(input)
    // /v1/me needs current_user:read, which the minimal file_content:read token lacks on purpose.
    const { file } = await api(`/v1/files/${key}/meta`, { tier: 3 })
    console.log(`✔ Access OK: "${file.name}" (${file.editorType}), last touched ${file.last_touched_at}`)
    mkdirSync(designDir, { recursive: true })
    writeFileSync(paths.key, key)
    console.log(`Stored key in design/.figma-key`)
  },

  async file() {
    if (existsSync(paths.file) && !process.argv.includes('--force')) {
      fail('design/figma-file.json already exists. Pass --force to spend another Tier 1 call.')
    }
    const data = await api(`/v1/files/${readKey()}`, { tier: 1 })
    writeFileSync(paths.file, JSON.stringify(data))
    const pages = data.document.children.map((p) => `${p.name} (${p.children?.length ?? 0} top-level nodes)`)
    console.log(`✔ Saved design/figma-file.json: "${data.name}"\n  Pages: ${pages.join(', ')}`)
  },

  async fills() {
    const { meta } = await api(`/v1/files/${readKey()}/images`, { tier: 2 })
    const entries = Object.entries(meta?.images ?? {})
    mkdirSync(paths.fills, { recursive: true })
    let ok = 0
    for (const [ref, url] of entries) {
      try {
        await download(url, join(paths.fills, ref))
        ok++
      } catch (err) {
        console.warn(`  ! ${err.message}`)
      }
    }
    console.log(`✔ Downloaded ${ok}/${entries.length} image fills to design/assets/fills`)
  },

  inventory() {
    const data = loadFile()
    const lines = [`# Inventário do Figma: ${data.name}`, '', `Gerado de \`design/figma-file.json\` (versão ${data.version}).`, '']
    const icons = new Map()
    const fillUsage = new Map()

    for (const page of data.document.children) {
      lines.push(`## Página: ${page.name}`, '', '| Frame | id | Tamanho |', '| --- | --- | --- |')
      for (const frame of page.children ?? []) {
        if (['FRAME', 'SECTION', 'COMPONENT', 'COMPONENT_SET'].includes(frame.type)) {
          lines.push(`| ${frame.name} | \`${frame.id}\` | ${size(frame)} |`)
        }
      }
      lines.push('')
      for (const [node, parents] of walk(page)) {
        for (const fill of node.fills ?? []) {
          if (fill.type === 'IMAGE' && fill.imageRef) tally(fillUsage, fill.imageRef, node.name)
        }
        const box = node.absoluteBoundingBox
        const small = box && box.width <= ICON_MAX_SIZE && box.height <= ICON_MAX_SIZE
        const insideIcon = parents.some((p) => icons.has(p.id))
        const isLogo = /logo/i.test(node.name) && ['FRAME', 'GROUP', 'INSTANCE', 'COMPONENT', 'VECTOR'].includes(node.type)
        if (insideIcon || node.visible === false) continue
        // Pre-order walk: the outermost small, purely vector node wins, so an icon
        // is exported whole instead of as loose "Vector" fragments.
        if ((small && isPureVector(node)) || isLogo) {
          icons.set(node.id, { id: node.id, name: node.name, key: node.componentId ?? `${node.name}:${size(node)}` })
        }
      }
    }

    // One export per distinct icon (same component or same name+size).
    const unique = [...new Map([...icons.values()].map((i) => [i.key, i])).values()]
    const used = new Map()
    const svgIds = unique.slice(0, SVG_BATCH_LIMIT).map((i) => {
      let name = slug(i.name)
      const n = (used.get(name) ?? 0) + 1
      used.set(name, n)
      if (n > 1) name = `${name}-${n}`
      return { id: i.id, name }
    })
    writeFileSync(paths.svgIds, JSON.stringify(svgIds, null, 2))

    lines.push('## Imagens de fill', '', '| imageRef | usos | exemplos de nó |', '| --- | ---: | --- |')
    for (const [ref, { count, samples }] of sorted(fillUsage)) lines.push(`| ${ref} | ${count} | ${[...samples].join(', ')} |`)
    lines.push('', `## Ícones e logo para export SVG (${svgIds.length}${unique.length > SVG_BATCH_LIMIT ? ` de ${unique.length}` : ''})`, '')
    lines.push(svgIds.map((s) => `\`${s.name}\``).join(', '), '')
    writeFileSync(paths.inventory, lines.join('\n'))
    console.log(`✔ design/inventory.md and design/svg-ids.json (${svgIds.length} icons, ${fillUsage.size} image fills)`)
  },

  async svgs() {
    if (!existsSync(paths.svgIds)) fail('Run `inventory` first.')
    const ids = JSON.parse(readFileSync(paths.svgIds, 'utf8'))
    const query = new URLSearchParams({ ids: ids.map((i) => i.id).join(','), format: 'svg', svg_outline_text: 'false', svg_simplify_stroke: 'true' })
    const { images, err } = await api(`/v1/images/${readKey()}?${query}`, { tier: 1 })
    if (err) fail(`Export error: ${err}`)
    mkdirSync(paths.svg, { recursive: true })
    const missing = []
    for (const { id, name } of ids) {
      if (!images[id]) {
        missing.push(name)
        continue
      }
      await download(images[id], join(paths.svg, `${name}.svg`))
    }
    console.log(`✔ Exported ${ids.length - missing.length}/${ids.length} SVGs to design/assets/svg`)
    if (missing.length) console.log(`  Not rendered: ${missing.join(', ')}`)
  },

  tokens() {
    const data = loadFile()
    const colors = new Map()
    const type = new Map()
    const radii = new Map()
    const effects = new Map()
    const spacing = new Map()
    const strokes = new Map()

    for (const [node] of walk(data.document)) {
      if (node.visible === false) continue
      for (const fill of node.fills ?? []) {
        if (fill.type === 'SOLID' && fill.visible !== false) tally(colors, hex(fill.color, (fill.opacity ?? 1) * fill.color.a), node.type === 'TEXT' ? 'text' : 'fill')
        if (fill.type?.startsWith('GRADIENT') && fill.visible !== false) {
          const stops = fill.gradientStops.map((s) => `${hex(s.color, s.color.a)} ${Math.round(s.position * 100)}%`).join(', ')
          tally(colors, `${fill.type.replace('GRADIENT_', '').toLowerCase()}-gradient(${stops})`, node.name)
        }
      }
      for (const stroke of node.strokes ?? []) {
        if (stroke.type === 'SOLID') tally(strokes, `${hex(stroke.color, stroke.color.a)} ${node.strokeWeight ?? 1}px`, node.name)
      }
      if (node.type === 'TEXT' && node.style) {
        const s = node.style
        const lh = s.lineHeightPx ? `${Math.round(s.lineHeightPx * 10) / 10}px` : 'auto'
        const ls = s.letterSpacing ? ` ls ${Math.round(s.letterSpacing * 100) / 100}px` : ''
        const tt = s.textCase && s.textCase !== 'ORIGINAL' ? ` ${s.textCase.toLowerCase()}` : ''
        tally(type, `${s.fontFamily} ${s.fontWeight} ${s.fontSize}px / ${lh}${ls}${tt}`, (node.characters ?? '').slice(0, 30))
      }
      if (node.cornerRadius) tally(radii, `${node.cornerRadius}px`, node.name)
      if (node.rectangleCornerRadii && new Set(node.rectangleCornerRadii).size > 1) tally(radii, node.rectangleCornerRadii.map((r) => `${r}px`).join(' '), node.name)
      for (const e of node.effects ?? []) {
        if (e.visible === false) continue
        const desc = e.type.includes('SHADOW')
          ? `${e.type === 'INNER_SHADOW' ? 'inset ' : ''}${e.offset.x}px ${e.offset.y}px ${e.radius}px ${e.spread ?? 0}px ${hex(e.color, e.color.a)}`
          : `${e.type.toLowerCase()} ${e.radius}px`
        tally(effects, desc, node.name)
      }
      if (node.layoutMode && node.layoutMode !== 'NONE') {
        const p = [node.paddingTop, node.paddingRight, node.paddingBottom, node.paddingLeft].map((v) => v ?? 0)
        if (p.some(Boolean)) tally(spacing, `padding ${p.join(' ')}`, node.name)
        if (node.itemSpacing) tally(spacing, `gap ${node.itemSpacing} (${node.layoutMode.toLowerCase()})`, node.name)
      }
    }

    const section = (title, map, header = 'valor') => [
      `## ${title}`,
      '',
      `| ${header} | usos | exemplos |`,
      '| --- | ---: | --- |',
      ...sorted(map).map(([k, { count, samples }]) => `| \`${k}\` | ${count} | ${[...samples].join(', ').replace(/\|/g, '/').replace(/\n/g, ' ')} |`),
      '',
    ]
    // Resolve each named style to the value of the first node that uses it.
    const styleValues = new Map()
    for (const [node] of walk(data.document)) {
      for (const [kind, id] of Object.entries(node.styles ?? {})) {
        if (styleValues.has(id)) continue
        const paint = kind === 'fill' || kind === 'fills' ? node.fills?.[0] : kind === 'stroke' || kind === 'strokes' ? node.strokes?.[0] : undefined
        if (paint?.type === 'SOLID') styleValues.set(id, hex(paint.color, (paint.opacity ?? 1) * paint.color.a))
        if (paint?.type?.startsWith('GRADIENT')) styleValues.set(id, paint.gradientStops.map((s) => hex(s.color, s.color.a)).join(' → '))
        if (kind === 'text' && node.style) styleValues.set(id, `${node.style.fontFamily} ${node.style.fontWeight} ${node.style.fontSize}px / ${node.style.lineHeightPx ? Math.round(node.style.lineHeightPx * 10) / 10 + 'px' : 'auto'}`)
      }
    }
    const styleNames = Object.entries(data.styles ?? {})
      .sort(([, a], [, b]) => a.styleType.localeCompare(b.styleType) || a.name.localeCompare(b.name))
      .map(([id, s]) => `- ${s.styleType} **${s.name}**: \`${styleValues.get(id) ?? '?'}\``)
    const fonts = [...new Set([...type.keys()].map((k) => k.replace(/ \d{3} .*/, '')))]

    writeFileSync(
      paths.tokens,
      [
        `# Tokens extraídos do Figma: ${data.name}`,
        '',
        'Gerado de `design/figma-file.json`. Valores ordenados por frequência de uso.',
        '',
        `**Famílias de fonte:** ${fonts.join(', ')}`,
        '',
        ...(styleNames.length ? ['## Estilos publicados no arquivo', '', ...styleNames, ''] : []),
        ...section('Cores (fills sólidos e gradientes)', colors, 'cor'),
        ...section('Tipografia', type, 'família peso tamanho / line-height'),
        ...section('Radius', radii),
        ...section('Sombras e efeitos', effects),
        ...section('Bordas', strokes),
        ...section('Espaçamento (auto-layout)', spacing),
      ].join('\n'),
    )
    console.log(`✔ design/tokens.md (${colors.size} colors, ${type.size} text styles, fonts: ${fonts.join(', ')})`)
  },
}

const [cmd, ...args] = process.argv.slice(2)
if (!commands[cmd]) fail(`Unknown command "${cmd ?? ''}". See header of scripts/figma/extract.mjs.`)
await commands[cmd](...args.filter((a) => !a.startsWith('--')))
