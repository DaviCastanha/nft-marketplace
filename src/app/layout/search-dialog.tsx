import { useNavigate } from '@tanstack/react-router'
import { useId, useState } from 'react'
import { SearchOutlineIcon } from '@/shared/components/icons'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'

/** Header search. The trigger is a Radix DialogTrigger, so focus returns to it on close. */
export function SearchDialog({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputId = useId()

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const q = query.trim()
    setOpen(false)
    // A new search starts from the first page; other filters are kept.
    void navigate({ to: '/', search: (prev) => ({ ...prev, q: q || undefined, page: undefined }), hash: 'mercado' })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="top-24 translate-y-0 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Buscar NFTs</DialogTitle>
          <DialogDescription>Busque por nome, coleção, criador ou ID do token.</DialogDescription>
        </DialogHeader>
        <form role="search" onSubmit={submit} className="flex gap-2">
          <label htmlFor={inputId} className="sr-only">
            Termo de busca
          </label>
          <Input id={inputId} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Explorar coleções" autoComplete="off" />
          <Button type="submit" size="icon" aria-label="Buscar">
            <SearchOutlineIcon className="size-5" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
