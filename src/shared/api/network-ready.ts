let release: () => void = () => undefined

/**
 * Resolves once the network layer is ready to serve requests: immediately against a real
 * backend, or after the MSW worker started in mock-enabled builds. The UI renders before
 * that; only requests (HTTP and the realtime socket) wait for it.
 */
export const networkReady = new Promise<void>((resolve) => {
  release = resolve
})

export function markNetworkReady() {
  release()
}
