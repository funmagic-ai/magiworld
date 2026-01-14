/**
 * @fileoverview Magi - AI Tools Dashboard
 * @fileoverview Magi - AI工具仪表板
 *
 * Two-view interface for AI-powered tools:
 * - Grid view: Browse all available tools
 * - Tool view: Use a selected tool (full-screen)
 * AI工具的双视图界面：
 * - 网格视图：浏览所有可用工具
 * - 工具视图：使用选定工具（全屏）
 *
 * Deep linking: /magi?tool=chat opens directly to the chat tool.
 * 深度链接：/magi?tool=chat 直接打开聊天工具。
 *
 * @module apps/admin/app/magi/page
 */

import { Suspense } from 'react';
import { MagiClient, MagiClientSkeleton } from '@/components/ai/magi-client';

export default function MagiPage() {
  return (
    <Suspense fallback={<MagiClientSkeleton />}>
      <MagiClient />
    </Suspense>
  );
}
