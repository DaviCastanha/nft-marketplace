import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { cartApi, cartQueries, cartQueryKey } from '@/features/cart/api'
import { announce } from '@/shared/a11y/announcer'
import type { ApiError } from '@/shared/api/errors'
import type { AddCartItemInput, Cart } from '@/shared/contracts/commerce'
import { useCurrentUser } from '@/shared/session/session-store'

export function useCart() {
  const user = useCurrentUser()
  return useQuery(cartQueries.cart(user?.id ?? null))
}

/** Writes the cart returned by a mutation straight into the cache (the API answers with the full cart). */
function useCartMutation<TVars>(mutationFn: (vars: TVars) => Promise<Cart>) {
  const user = useCurrentUser()
  const queryClient = useQueryClient()
  return useMutation<Cart, ApiError, TVars>({
    mutationFn,
    onSuccess: (cart) => queryClient.setQueryData(cartQueryKey(user?.id ?? null), cart),
  })
}

export function useAddToCart() {
  const mutation = useCartMutation((input: AddCartItemInput & { name: string; editionLabel: string }) =>
    cartApi.add({ nftId: input.nftId, editionId: input.editionId, quantity: input.quantity }),
  )
  return {
    ...mutation,
    add: (input: AddCartItemInput & { name: string; editionLabel: string }, options: { onSuccess?: () => void } = {}) =>
      mutation.mutate(input, {
        onSuccess: () => {
          const message = `${input.name} (edição ${input.editionLabel}) adicionado ao carrinho.`
          toast.success(message)
          announce(message)
          options.onSuccess?.()
        },
        onError: (error) => {
          toast.error(error.message)
          announce(error.message)
        },
      }),
  }
}

export function useUpdateCartItem() {
  return useCartMutation(({ itemId, quantity }: { itemId: string; quantity: number }) => cartApi.update(itemId, quantity))
}

export function useRemoveCartItem() {
  return useCartMutation(({ itemId }: { itemId: string }) => cartApi.remove(itemId))
}

export function useApplyCoupon() {
  return useCartMutation(({ code }: { code: string }) => cartApi.applyCoupon(code))
}

export function useRemoveCoupon() {
  return useCartMutation(() => cartApi.removeCoupon())
}
