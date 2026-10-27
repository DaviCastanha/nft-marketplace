# Lighthouse: medianas

Gerado por `npm run lighthouse` em 2026-10-27T02:42:22.374Z. Mediana de 3 execuções por página e perfil, build de demonstração (bundle de produção + MSW, cenário padrão).

| Página | Perfil | Performance | Accessibility | Best Practices | SEO |
| --- | --- | ---: | ---: | ---: | ---: |
| Início | Mobile | 72 | 100 | 100 | 100 |
| Início | Desktop | 98 | 100 | 100 | 100 |
| Detalhe do NFT | Mobile | 76 | 100 | 100 | 100 |
| Detalhe do NFT | Desktop | 99 | 100 | 100 | 100 |

| Página | Perfil | LCP | CLS | TBT | FCP | Speed Index |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Início | Mobile | 5016 ms | 0.000 | 228 ms | 2994 ms | 2994 ms |
| Início | Desktop | 1025 ms | 0.000 | 28 ms | 705 ms | 853 ms |
| Detalhe do NFT | Mobile | 4465 ms | 0.000 | 187 ms | 2982 ms | 2982 ms |
| Detalhe do NFT | Desktop | 946 ms | 0.000 | 0 ms | 610 ms | 610 ms |

## Execuções individuais

| Página | Perfil | Execução | Perf. | A11y | BP | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Início | Mobile | 1 | 72 | 100 | 100 | 100 | 5016 ms | 0.000 | 228 ms |
| Início | Mobile | 2 | 62 | 100 | 100 | 100 | 5077 ms | 0.000 | 521 ms |
| Início | Mobile | 3 | 73 | 100 | 100 | 100 | 5015 ms | 0.000 | 208 ms |
| Início | Desktop | 1 | 98 | 100 | 100 | 100 | 1030 ms | 0.000 | 32 ms |
| Início | Desktop | 2 | 98 | 100 | 100 | 100 | 1025 ms | 0.000 | 28 ms |
| Início | Desktop | 3 | 99 | 100 | 100 | 100 | 982 ms | 0.000 | 4 ms |
| Detalhe do NFT | Mobile | 1 | 77 | 100 | 100 | 100 | 4461 ms | 0.000 | 154 ms |
| Detalhe do NFT | Mobile | 2 | 61 | 100 | 100 | 100 | 4699 ms | 0.000 | 647 ms |
| Detalhe do NFT | Mobile | 3 | 76 | 100 | 100 | 100 | 4465 ms | 0.000 | 187 ms |
| Detalhe do NFT | Desktop | 1 | 99 | 100 | 100 | 100 | 940 ms | 0.000 | 0 ms |
| Detalhe do NFT | Desktop | 2 | 99 | 100 | 100 | 100 | 946 ms | 0.000 | 0 ms |
| Detalhe do NFT | Desktop | 3 | 99 | 100 | 100 | 100 | 967 ms | 0.000 | 0 ms |

## Ambiente e condições

- Lighthouse 13.5.0; navegador: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/156.0.0.0 Safari/537.36`
- Node v22.14.0; Windows_NT 10.0.26200 (x64); Intel(R) Core(TM) i5-9300HF CPU @ 2.40GHz (8 núcleos, 16 GB); benchmarkIndex 1803.5
- URL base: http://localhost:4173 (`vite preview` do build `--mode demo`); Chrome novo e sem cache a cada execução
- Perfil Mobile: formFactor mobile, throttling simulate (RTT 150 ms, 1638 kbps, CPU 4×)
- Perfil Desktop: formFactor desktop, throttling simulate (RTT 40 ms, 10240 kbps, CPU 1×)

Relatórios completos (HTML/JSON) de cada execução: `lighthouse/reports/`.
