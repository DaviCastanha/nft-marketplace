# Lighthouse: medianas

Gerado por `npm run lighthouse` em 2026-10-27T19:48:47.745Z. Mediana de 3 execuções por página e perfil, build de demonstração (bundle de produção + MSW, cenário padrão).

| Página | Perfil | Performance | Accessibility | Best Practices | SEO |
| --- | --- | ---: | ---: | ---: | ---: |
| Início | Mobile | 75 | 100 | 100 | 100 |
| Início | Desktop | 99 | 100 | 100 | 100 |
| Detalhe do NFT | Mobile | 78 | 100 | 100 | 100 |
| Detalhe do NFT | Desktop | 99 | 100 | 100 | 100 |

| Página | Perfil | LCP | CLS | TBT | FCP | Speed Index |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Início | Mobile | 4978 ms | 0.000 | 121 ms | 3050 ms | 3050 ms |
| Início | Desktop | 993 ms | 0.000 | 0 ms | 626 ms | 641 ms |
| Detalhe do NFT | Mobile | 4513 ms | 0.000 | 130 ms | 3044 ms | 3044 ms |
| Detalhe do NFT | Desktop | 964 ms | 0.000 | 0 ms | 584 ms | 584 ms |

## Execuções individuais

| Página | Perfil | Execução | Perf. | A11y | BP | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Início | Mobile | 1 | 75 | 100 | 100 | 100 | 4978 ms | 0.000 | 132 ms |
| Início | Mobile | 2 | 75 | 100 | 100 | 100 | 4975 ms | 0.000 | 121 ms |
| Início | Mobile | 3 | 75 | 100 | 100 | 100 | 5004 ms | 0.000 | 116 ms |
| Início | Desktop | 1 | 99 | 100 | 100 | 100 | 993 ms | 0.000 | 0 ms |
| Início | Desktop | 2 | 98 | 100 | 100 | 100 | 1003 ms | 0.000 | 0 ms |
| Início | Desktop | 3 | 99 | 100 | 100 | 100 | 942 ms | 0.000 | 0 ms |
| Detalhe do NFT | Mobile | 1 | 78 | 100 | 100 | 100 | 4498 ms | 0.000 | 96 ms |
| Detalhe do NFT | Mobile | 2 | 77 | 100 | 100 | 100 | 4513 ms | 0.000 | 130 ms |
| Detalhe do NFT | Mobile | 3 | 78 | 100 | 100 | 100 | 4517 ms | 0.000 | 137 ms |
| Detalhe do NFT | Desktop | 1 | 99 | 100 | 100 | 100 | 962 ms | 0.000 | 0 ms |
| Detalhe do NFT | Desktop | 2 | 99 | 100 | 100 | 100 | 964 ms | 0.000 | 0 ms |
| Detalhe do NFT | Desktop | 3 | 98 | 100 | 100 | 100 | 1055 ms | 0.000 | 0 ms |

## Ambiente e condições

- Lighthouse 13.5.0; navegador: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/156.0.0.0 Safari/537.36`
- Node v22.14.0; Windows_NT 10.0.26200 (x64); Intel(R) Core(TM) i5-9300HF CPU @ 2.40GHz (8 núcleos, 16 GB); benchmarkIndex 2065.5
- URL base: http://localhost:4173 (`vite preview` do build `--mode demo`); Chrome novo e sem cache a cada execução
- Perfil Mobile: formFactor mobile, throttling simulate (RTT 150 ms, 1638 kbps, CPU 4×)
- Perfil Desktop: formFactor desktop, throttling simulate (RTT 40 ms, 10240 kbps, CPU 1×)

Relatórios completos (HTML/JSON) de cada execução: `lighthouse/reports/`.
