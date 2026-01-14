/**
 * @fileoverview Skeleton UI Component
 * @fileoverview 骨架屏UI组件
 *
 * Loading placeholder with pulsing animation.
 * Used while content is being fetched.
 * 带脉冲动画的加载占位符。
 * 用于内容加载时显示。
 *
 * @module components/ui/skeleton
 */

import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-muted rounded-md animate-pulse", className)}
      {...props}
    />
  )
}

export { Skeleton }
