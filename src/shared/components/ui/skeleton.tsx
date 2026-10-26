import { cn } from "@/shared/lib/utils"

/** Shimmer placeholder; the sweep is disabled under prefers-reduced-motion (see .skeleton-shimmer). */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("skeleton-shimmer rounded-md", className)}
      {...props}
    />
  )
}

export { Skeleton }
