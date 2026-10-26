#!/usr/bin/env node
// Prints a readable tree of a Figma node from design/figma-file.json (offline "Inspect").
// Usage: node scripts/figma/dump.mjs "<frame name or node id>" [maxDepth=4] [filter text]

import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const data = JSON.parse(readFileSync(join(root, 'design', 'figma-file.json'), 'utf8'))
const [target, depthArg = '4', filter] = process.argv.slice(2)
const maxDepth = Number(depthArg)

const hex = ({ r, g, b }, a = 1) =>
  '#' + [r, g, b].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('') + (a < 1 ? Math.round(a * 255).toString(16).padStart(2, '0') : '')

function* walk(node, depth = 0) {
  yield [node, depth]
  for (const child of node.children ?? []) yield* walk(child, depth + 1)
}

const found = [...walk(data.document)].map(([n]) => n).find((n) => n.id === target || n.name === target)
if (!found) {
  console.error(`Node "${target}" not found`)
  process.exit(1)
}
const origin = found.absoluteBoundingBox ?? { x: 0, y: 0 }

function describe(node) {
  const b = node.absoluteBoundingBox
  const parts = [`${node.type} "${node.name}" [${node.id}]`]
  if (b) parts.push(`@${Math.round(b.x - origin.x)},${Math.round(b.y - origin.y)} ${Math.round(b.width)}×${Math.round(b.height)}`)
  const fill = (node.fills ?? []).find((f) => f.visible !== false)
  if (fill?.type === 'SOLID') parts.push(`fill ${hex(fill.color, (fill.opacity ?? 1) * fill.color.a)}`)
  else if (fill) parts.push(`fill ${fill.type}`)
  const stroke = (node.strokes ?? []).find((s) => s.visible !== false)
  if (stroke?.type === 'SOLID') parts.push(`stroke ${hex(stroke.color)} ${node.strokeWeight}px`)
  if (node.cornerRadius) parts.push(`r${node.cornerRadius}`)
  if (node.layoutMode && node.layoutMode !== 'NONE') {
    parts.push(`${node.layoutMode.toLowerCase()} gap${node.itemSpacing ?? 0} pad${[node.paddingTop, node.paddingRight, node.paddingBottom, node.paddingLeft].map((v) => v ?? 0).join('/')}`)
  }
  if (node.type === 'TEXT') {
    const s = node.style
    parts.push(`"${(node.characters ?? '').replace(/\n/g, '⏎').slice(0, 70)}" ${s.fontWeight} ${s.fontSize}px lh${Math.round(s.lineHeightPx ?? 0)}${s.letterSpacing ? ` ls${s.letterSpacing}` : ''}${s.textCase && s.textCase !== 'ORIGINAL' ? ` ${s.textCase}` : ''}`)
  }
  if (node.effects?.length) parts.push(`fx:${node.effects.filter((e) => e.visible !== false).map((e) => e.type).join(',')}`)
  if (node.visible === false) parts.push('(hidden)')
  return parts.join(' ')
}

for (const [node, depth] of walk(found)) {
  if (depth > maxDepth) continue
  const line = describe(node)
  if (filter && !line.toLowerCase().includes(filter.toLowerCase())) continue
  console.log('  '.repeat(depth) + line)
}
