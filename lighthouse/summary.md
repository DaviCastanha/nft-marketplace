# Lighthouse: medianas

Gerado por `npm run lighthouse` em 2026-10-27T00:55:41.725Z. Mediana de 3 execuções por página e perfil, build de demonstração (bundle de produção + MSW, cenário padrão).

| Página | Perfil | Performance | Accessibility | Best Practices | SEO |
| --- | --- | ---: | ---: | ---: | ---: |
| Início | Mobile | 74 | 100 | 100 | 100 |
| Início | Desktop | 99 | 100 | 100 | 100 |
| Detalhe do NFT | Mobile | 78 | 100 | 100 | 100 |
| Detalhe do NFT | Desktop | 99 | 100 | 100 | 100 |

| Página | Perfil | LCP | CLS | TBT | FCP | Speed Index |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Início | Mobile | 4987 ms | 0.000 | 153 ms | 2912 ms | 2912 ms |
| Início | Desktop | 976 ms | 0.000 | 0 ms | 618 ms | 627 ms |
| Detalhe do NFT | Mobile | 4512 ms | 0.000 | 112 ms | 2912 ms | 2912 ms |
| Detalhe do NFT | Desktop | 957 ms | 0.000 | 0 ms | 589 ms | 589 ms |

## Execuções individuais

| Página | Perfil | Execução | Perf. | A11y | BP | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Início | Mobile | 1 | 74 | 100 | 100 | 100 | 4974 ms | 0.000 | 153 ms |
| Início | Mobile | 2 | 74 | 100 | 100 | 100 | 5005 ms | 0.000 | 195 ms |
| Início | Mobile | 3 | 76 | 100 | 100 | 100 | 4987 ms | 0.000 | 124 ms |
| Início | Desktop | 1 | 99 | 100 | 100 | 100 | 977 ms | 0.000 | 0 ms |
| Início | Desktop | 2 | 99 | 100 | 100 | 100 | 976 ms | 0.000 | 0 ms |
| Início | Desktop | 3 | 99 | 100 | 100 | 100 | 966 ms | 0.000 | 0 ms |
| Detalhe do NFT | Mobile | 1 | 78 | 100 | 100 | 100 | 4528 ms | 0.000 | 112 ms |
| Detalhe do NFT | Mobile | 2 | 79 | 100 | 100 | 100 | 4419 ms | 0.000 | 105 ms |
| Detalhe do NFT | Mobile | 3 | 78 | 100 | 100 | 100 | 4512 ms | 0.000 | 113 ms |
| Detalhe do NFT | Desktop | 1 | 99 | 100 | 100 | 100 | 958 ms | 0.000 | 0 ms |
| Detalhe do NFT | Desktop | 2 | 99 | 100 | 100 | 100 | 951 ms | 0.000 | 0 ms |
| Detalhe do NFT | Desktop | 3 | 99 | 100 | 100 | 100 | 957 ms | 0.000 | 0 ms |

## Ambiente e condições

- Lighthouse 13.5.0; navegador: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/156.0.0.0 Safari/537.36`
- Node v22.14.0; Windows_NT 10.0.26200 (x64); Intel(R) Core(TM) i5-9300HF CPU @ 2.40GHz (8 núcleos, 16 GB); benchmarkIndex 1954.5
- URL base: http://localhost:4173 (`vite preview` do build `--mode demo`); Chrome novo e sem cache a cada execução
- Perfil Mobile: formFactor mobile, throttling simulate (RTT 150 ms, 1638 kbps, CPU 4×)
- Perfil Desktop: formFactor desktop, throttling simulate (RTT 40 ms, 10240 kbps, CPU 1×)

Relatórios completos (HTML/JSON) de cada execução: `lighthouse/reports/`.
