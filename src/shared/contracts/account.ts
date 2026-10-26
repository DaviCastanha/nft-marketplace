import { z } from 'zod'
import { isoDateSchema, networkSchema, walletAddressSchema, walletProviderSchema } from '@/shared/contracts/common'

const ENS_SUFFIXES = ['.eth', '.xyz', '.nft'] as const
export const ensSuffixSchema = z.enum(ENS_SUFFIXES)
export { ENS_SUFFIXES }

const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Use pelo menos 3 caracteres')
  .max(24, 'Use no máximo 24 caracteres')
  .regex(/^[a-z0-9_.]+$/i, 'Use apenas letras, números, ponto e sublinhado')

const emailSchema = z.email('Informe um e-mail válido').trim().toLowerCase()

export const passwordSchema = z
  .string()
  .min(8, 'A senha precisa de pelo menos 8 caracteres')
  .max(64, 'Use no máximo 64 caracteres')
  .regex(/[A-Za-z]/, 'Inclua pelo menos uma letra')
  .regex(/\d/, 'Inclua pelo menos um número')

// ---------------------------------------------------------------------------
// User and session

export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  username: z.string(),
  displayName: z.string(),
  ensName: z.string(),
  ensSuffix: ensSuffixSchema,
  walletNickname: z.string(),
  avatarUrl: z.string().nullable(),
})
export type User = z.infer<typeof userSchema>

export const sessionSchema = z.object({
  token: z.string(),
  expiresAt: isoDateSchema,
  user: userSchema,
})
export type Session = z.infer<typeof sessionSchema>

export const loginInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Informe sua senha'),
})
export type LoginInput = z.infer<typeof loginInputSchema>

export const signupInputSchema = z
  .object({
    username: usernameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirme sua senha'),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'As senhas não conferem' })
export type SignupInput = z.infer<typeof signupInputSchema>

// ---------------------------------------------------------------------------
// Profile

export const profileInputSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe seu nome de exibição').max(40, 'Use no máximo 40 caracteres'),
  username: usernameSchema,
  email: emailSchema,
  ensName: z
    .string()
    .trim()
    .min(3, 'Informe o nome ENS')
    .max(32, 'Use no máximo 32 caracteres')
    .regex(/^[a-z0-9-]+$/i, 'Use letras, números e hífen'),
  ensSuffix: ensSuffixSchema,
  walletNickname: z.string().trim().min(2, 'Informe o apelido da carteira').max(32, 'Use no máximo 32 caracteres'),
})
export type ProfileInput = z.infer<typeof profileInputSchema>

/** Avatar is resized on the client and uploaded as a small data URL. */
export const avatarInputSchema = z.object({
  dataUrl: z
    .string()
    .regex(/^data:image\/(png|jpeg|webp);base64,/, 'Formato de imagem não suportado')
    .max(400_000, 'Imagem muito grande'),
})
export type AvatarInput = z.infer<typeof avatarInputSchema>

export const passwordChangeInputSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirme a nova senha'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { path: ['confirmPassword'], message: 'As senhas não conferem' })
  .refine((v) => v.newPassword !== v.currentPassword, { path: ['newPassword'], message: 'A nova senha deve ser diferente da atual' })
export type PasswordChangeInput = z.infer<typeof passwordChangeInputSchema>

// ---------------------------------------------------------------------------
// Wallets (primary and secondary slots)

export const WALLET_SLOTS = ['primary', 'secondary'] as const
export const walletSlotSchema = z.enum(WALLET_SLOTS)
export type WalletSlot = z.infer<typeof walletSlotSchema>

export const walletInputSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe o nome de exibição').max(40, 'Use no máximo 40 caracteres'),
  nickname: z.string().trim().min(2, 'Informe o apelido da carteira').max(32, 'Use no máximo 32 caracteres'),
  network: networkSchema,
  profileName: z.string().trim().min(2, 'Informe o nome do perfil').max(40, 'Use no máximo 40 caracteres'),
  address: walletAddressSchema,
  secondaryAddress: z.string().trim().max(64, 'Use no máximo 64 caracteres'),
  provider: walletProviderSchema,
  referralCode: z
    .string()
    .trim()
    .min(4, 'Informe o código de indicação')
    .max(16, 'Use no máximo 16 caracteres')
    .regex(/^[A-Z0-9-]+$/i, 'Use letras, números e hífen'),
  email: emailSchema,
  ensName: z
    .string()
    .trim()
    .min(3, 'Informe o nome ENS')
    .max(32, 'Use no máximo 32 caracteres')
    .regex(/^[a-z0-9-]+$/i, 'Use letras, números e hífen'),
  ensSuffix: ensSuffixSchema,
})
export type WalletInput = z.infer<typeof walletInputSchema>

export const walletSchema = walletInputSchema.extend({
  id: z.string(),
  slot: walletSlotSchema,
  updatedAt: isoDateSchema,
})
export type Wallet = z.infer<typeof walletSchema>

export const walletsResponseSchema = z.object({
  primary: walletSchema.nullable(),
  secondary: walletSchema.nullable(),
})
export type WalletsResponse = z.infer<typeof walletsResponseSchema>

/** Simulated wallet connection (approval prompt, rejection and disconnection). */
export const walletSessionSchema = z.object({
  id: z.string(),
  walletId: z.string(),
  provider: walletProviderSchema,
  network: networkSchema,
  address: z.string(),
  connectedAt: isoDateSchema,
})
export type WalletSession = z.infer<typeof walletSessionSchema>

export const walletSessionInputSchema = z.object({
  walletId: z.string(),
  network: networkSchema,
})
export type WalletSessionInput = z.infer<typeof walletSessionInputSchema>
