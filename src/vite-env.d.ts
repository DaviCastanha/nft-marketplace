/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENABLE_MOCKS: 'true' | 'false'
  readonly VITE_API_URL: string
  /** Empty means same origin. */
  readonly VITE_SOCKET_URL: string
  readonly VITE_MOCK_SCENARIO: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
