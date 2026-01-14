/**
 * @fileoverview Label UI Component
 * @fileoverview 标签UI组件
 *
 * Accessible label for form inputs with consistent typography.
 * Associates with input via htmlFor attribute.
 * 表单输入的无障碍标签，具有统一的排版。
 * 通过htmlFor属性与输入关联。
 *
 * @module components/ui/label
 */

"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "gap-2 text-sm leading-none font-medium group-data-[disabled=true]:opacity-50 peer-disabled:opacity-50 flex items-center select-none group-data-[disabled=true]:pointer-events-none peer-disabled:cursor-not-allowed",
        className
      )}
      {...props}
    />
  )
}

export { Label }
