import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { ApiError } from '@/shared/api/errors'

/**
 * Maps API validation/conflict errors onto form fields. Returns false when the
 * error has no field information, so the caller can show a form-level message.
 */
export function applyApiFieldErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>, fields: readonly Path<T>[]): boolean {
  if (!(error instanceof ApiError)) return false
  let applied = false
  for (const [name, message] of Object.entries(error.fields)) {
    if ((fields as readonly string[]).includes(name)) {
      setError(name as Path<T>, { type: 'server', message }, { shouldFocus: !applied })
      applied = true
    }
  }
  return applied
}
