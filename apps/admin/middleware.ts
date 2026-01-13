import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Auth is handled in the dashboard layout using getLogtoContext()
// This middleware is kept minimal for future use (e.g., rate limiting, logging)
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
