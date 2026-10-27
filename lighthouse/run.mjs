#!/usr/bin/env node
// Lighthouse audit of the optimized demo build (production bundle + MSW, default scenario).
// Pages × profiles × runs as configured below; reports go to lighthouse/reports and the
// medians to lighthouse/summary.md / summary.json.
//
// Usage: npm run lighthouse            (build + preview + audits)
//        LH_BASE_URL=https://... npm run lighthouse   (audit an already running deployment)

import { mkdirSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as chromeLauncher from 'chrome-launcher'
import lighthouse from 'lighthouse'
import desktopConfig from 'lighthouse/core/config/desktop-config.js'
import { build, preview } from 'vite'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const reportsDir = join(root, 'lighthouse', 'reports')
const PORT = 4173
const RUNS = Number(process.env.LH_RUNS ?? 3)

const PAGES = [
  { id: 'inicio', label: 'Início', path: '/' },
  { id: 'detalhe', label: 'Detalhe do NFT', path: '/nfts/emerald-ape-042' },
]
/** Mobile uses Lighthouse defaults (Moto G Power, simulated slow 4G, 4× CPU); desktop the official preset. */
const PROFILES = [
  { id: 'mobile', label: 'Mobile', config: undefined },
  { id: 'desktop', label: 'Desktop', config: desktopConfig },
]
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo']
const METRICS = [
  { id: 'largest-contentful-paint', label: 'LCP', unit: 'ms' },
  { id: 'cumulative-layout-shift', label: 'CLS', unit: '' },
  { id: 'total-blocking-time', label: 'TBT', unit: 'ms' },
  { id: 'first-contentful-paint', label: 'FCP', unit: 'ms' },
  { id: 'speed-index', label: 'Speed Index', unit: 'ms' },
]

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

async function startServer() {
  if (process.env.LH_BASE_URL) return { baseUrl: process.env.LH_BASE_URL.replace(/\/$/, ''), close: async () => {} }
  console.log('› Building the demo bundle (vite build --mode demo)…')
  await build({ root, mode: 'demo', logLevel: 'warn' })
  const server = await preview({ root, mode: 'demo', preview: { port: PORT, strictPort: true }, logLevel: 'warn' })
  return { baseUrl: `http://localhost:${PORT}`, close: () => new Promise((done) => server.httpServer.close(done)) }
}

async function auditOnce(url, profile, run, pageId) {
  // A fresh browser per run: no warm caches, no service worker left from a previous run.
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-first-run', '--disable-extensions'] })
  try {
    const result = await lighthouse(url, { port: chrome.port, output: ['html', 'json'], logLevel: 'error' }, profile.config)
    const [html, json] = result.report
    const base = join(reportsDir, `${pageId}-${profile.id}-run${run}`)
    writeFileSync(`${base}.report.html`, html)
    writeFileSync(`${base}.report.json`, json)
    return result.lhr
  } finally {
    await chrome.kill()
  }
}

async function main() {
  mkdirSync(reportsDir, { recursive: true })
  const server = await startServer()
  const results = []
  let environment = null
  try {
    // Optional filters for quick experiments: LH_PAGE=inicio LH_PROFILE=mobile
    for (const page of PAGES.filter((p) => !process.env.LH_PAGE || p.id === process.env.LH_PAGE)) {
      for (const profile of PROFILES.filter((p) => !process.env.LH_PROFILE || p.id === process.env.LH_PROFILE)) {
        const runs = []
        for (let run = 1; run <= RUNS; run++) {
          process.stdout.write(`› ${page.label} · ${profile.label} · execução ${run}/${RUNS}… `)
          const lhr = await auditOnce(`${server.baseUrl}${page.path}`, profile, run, page.id)
          environment ??= {
            lighthouse: lhr.lighthouseVersion,
            userAgent: lhr.environment.hostUserAgent,
            benchmarkIndex: lhr.environment.benchmarkIndex,
          }
          runs.push({
            scores: Object.fromEntries(CATEGORIES.map((c) => [c, Math.round((lhr.categories[c]?.score ?? 0) * 100)])),
            metrics: Object.fromEntries(METRICS.map((m) => [m.id, lhr.audits[m.id]?.numericValue ?? NaN])),
            throttling: lhr.configSettings.throttling,
            formFactor: lhr.configSettings.formFactor,
          })
          console.log(CATEGORIES.map((c) => `${c}=${runs.at(-1).scores[c]}`).join(' '))
        }
        results.push({
          page: page.id,
          pageLabel: page.label,
          profile: profile.id,
          profileLabel: profile.label,
          formFactor: runs[0].formFactor,
          throttling: runs[0].throttling,
          runs,
          median: {
            scores: Object.fromEntries(CATEGORIES.map((c) => [c, median(runs.map((r) => r.scores[c]))])),
            metrics: Object.fromEntries(METRICS.map((m) => [m.id, median(runs.map((r) => r.metrics[m.id]))])),
          },
        })
      }
    }
  } finally {
    await server.close()
  }

  const env = {
    ...environment,
    node: process.version,
    os: `${os.type()} ${os.release()} (${os.arch()})`,
    cpu: os.cpus()[0]?.model ?? 'unknown',
    cores: os.cpus().length,
    memoryGb: Math.round(os.totalmem() / 1024 ** 3),
    date: new Date().toISOString(),
    baseUrl: server.baseUrl,
    runs: RUNS,
    scenario: 'default (MSW)',
  }
  writeFileSync(join(root, 'lighthouse', 'summary.json'), JSON.stringify({ environment: env, results }, null, 2))

  const fmt = (metric, value) => (metric.unit === 'ms' ? `${Math.round(value)} ms` : value.toFixed(3))
  const lines = [
    '# Lighthouse: medianas',
    '',
    `Gerado por \`npm run lighthouse\` em ${env.date}. Mediana de ${RUNS} execuções por página e perfil, build de demonstração (bundle de produção + MSW, cenário padrão).`,
    '',
    '| Página | Perfil | Performance | Accessibility | Best Practices | SEO |',
    '| --- | --- | ---: | ---: | ---: | ---: |',
    ...results.map((r) => `| ${r.pageLabel} | ${r.profileLabel} | ${CATEGORIES.map((c) => r.median.scores[c]).join(' | ')} |`),
    '',
    '| Página | Perfil | ' + METRICS.map((m) => m.label).join(' | ') + ' |',
    '| --- | --- | ' + METRICS.map(() => '---:').join(' | ') + ' |',
    ...results.map((r) => `| ${r.pageLabel} | ${r.profileLabel} | ${METRICS.map((m) => fmt(m, r.median.metrics[m.id])).join(' | ')} |`),
    '',
    '## Execuções individuais',
    '',
    '| Página | Perfil | Execução | Perf. | A11y | BP | SEO | LCP | CLS | TBT |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...results.flatMap((r) =>
      r.runs.map(
        (run, i) =>
          `| ${r.pageLabel} | ${r.profileLabel} | ${i + 1} | ${CATEGORIES.map((c) => run.scores[c]).join(' | ')} | ${Math.round(run.metrics['largest-contentful-paint'])} ms | ${run.metrics['cumulative-layout-shift'].toFixed(3)} | ${Math.round(run.metrics['total-blocking-time'])} ms |`,
      ),
    ),
    '',
    '## Ambiente e condições',
    '',
    `- Lighthouse ${env.lighthouse}; navegador: \`${env.userAgent}\``,
    `- Node ${env.node}; ${env.os}; ${env.cpu} (${env.cores} núcleos, ${env.memoryGb} GB); benchmarkIndex ${env.benchmarkIndex}`,
    `- URL base: ${env.baseUrl} (\`vite preview\` do build \`--mode demo\`); Chrome novo e sem cache a cada execução`,
    ...results
      .filter((r, i, all) => all.findIndex((x) => x.profile === r.profile) === i)
      .map(
        (r) =>
          `- Perfil ${r.profileLabel}: formFactor ${r.formFactor}, throttling ${r.throttling.method ?? 'simulate'} (RTT ${r.throttling.rttMs} ms, ${Math.round(r.throttling.throughputKbps)} kbps, CPU ${r.throttling.cpuSlowdownMultiplier}×)`,
      ),
    '',
    'Relatórios completos (HTML/JSON) de cada execução: `lighthouse/reports/`.',
    '',
  ]
  writeFileSync(join(root, 'lighthouse', 'summary.md'), lines.join('\n'))
  console.log('\n' + lines.slice(4, 6 + results.length).join('\n'))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
