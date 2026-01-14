/**
 * @fileoverview Collapsible UI Component
 * @fileoverview 可折叠UI组件
 *
 * Expandable/collapsible content with trigger.
 * Based on Base UI Collapsible primitive.
 * 带触发器的可展开/折叠内容组件。
 * 基于Base UI Collapsible原语构建。
 *
 * @module components/ui/collapsible
 */

"use client"

import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible"

function Collapsible({ ...props }: CollapsiblePrimitive.Root.Props) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
}

function CollapsibleTrigger({ ...props }: CollapsiblePrimitive.Trigger.Props) {
  return (
    <CollapsiblePrimitive.Trigger data-slot="collapsible-trigger" {...props} />
  )
}

function CollapsibleContent({ ...props }: CollapsiblePrimitive.Panel.Props) {
  return (
    <CollapsiblePrimitive.Panel data-slot="collapsible-content" {...props} />
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
