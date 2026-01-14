/**
 * @fileoverview Separator UI Component
 * @fileoverview 分隔符UI组件
 *
 * Visual divider for horizontal or vertical separation.
 * Based on Base UI Separator primitive.
 * 用于水平或垂直分隔的视觉分隔线。
 * 基于Base UI Separator原语构建。
 *
 * @module components/ui/separator
 */

"use client"

import { Separator as SeparatorPrimitive } from "@base-ui/react/separator"

import { cn } from "@/lib/utils"

function Separator({
  className,
  orientation = "horizontal",
  ...props
}: SeparatorPrimitive.Props) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      className={cn(
        "bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px data-[orientation=vertical]:self-stretch",
        className
      )}
      {...props}
    />
  )
}

export { Separator }
