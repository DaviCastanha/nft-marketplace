import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/** Entry routes (home and NFT detail) ship with the app chunk: one less round trip before the LCP. */
const ENTRY_ROUTES = new Set(['/', '/nfts/$nftId'])

/**
 * The app is a dynamic import of the entry (see main.tsx), so the browser would only discover
 * it after downloading and running the entry. Declaring it as modulepreload in the HTML lets
 * both download in parallel. The mock worker is deliberately left out: on slow connections its
 * size competes for bandwidth with the first render (measured: FCP +0.5 s on mobile).
 */
function preloadBootChunks(): Plugin {
  const BOOT_MODULES = ['/src/app/app.tsx']
  return {
    name: 'kurio:preload-boot-chunks',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, { bundle }) {
        if (!bundle) return []
        return Object.values(bundle)
          .filter((chunk) => chunk.type === 'chunk' && BOOT_MODULES.some((m) => chunk.facadeModuleId?.replaceAll('\\', '/').endsWith(m)))
          .map((chunk) => ({ tag: 'link', attrs: { rel: 'modulepreload', crossorigin: '', href: `/${chunk.fileName}` }, injectTo: 'head' as const }))
      },
    },
  }
}

export default defineConfig({
  plugins: [
    // Must come before the React plugin so generated route files are transformed.
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      codeSplittingOptions: {
        splitBehavior: ({ routeId }: { routeId: string }) => (ENTRY_ROUTES.has(routeId) ? [] : undefined),
      },
    }),
    react(),
    tailwindcss(),
    preloadBootChunks(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
})
