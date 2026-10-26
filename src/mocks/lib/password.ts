/** PBKDF2-SHA256 via WebCrypto: the mock never stores passwords in clear text. */
const ITERATIONS = 100_000

export interface PasswordHash {
  salt: string
  hash: string
}

export async function hashPassword(password: string, salt = randomSalt()): Promise<PasswordHash> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(salt), iterations: ITERATIONS },
    key,
    256,
  )
  return { salt, hash: toHex(new Uint8Array(bits)) }
}

export async function verifyPassword(password: string, stored: PasswordHash) {
  const { hash } = await hashPassword(password, stored.salt)
  return hash === stored.hash
}

function randomSalt() {
  return toHex(crypto.getRandomValues(new Uint8Array(16)))
}

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function fromHex(hex: string) {
  return new Uint8Array(hex.match(/.{2}/g)?.map((byte) => parseInt(byte, 16)) ?? [])
}
