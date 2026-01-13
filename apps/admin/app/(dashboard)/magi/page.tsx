/**
 * @fileoverview Magi - AI Tools Dashboard
 *
 * Two-view interface for AI-powered tools:
 * - Grid view: Browse all available tools
 * - Tool view: Use a selected tool (full-screen)
 *
 * Deep linking: /magi?tool=chat opens directly to the chat tool.
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
