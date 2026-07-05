import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME, verifySession } from '@/lib/auth';

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/admin/') &&
      !request.nextUrl.pathname.startsWith('/api/admin/login')) {
    const cookie = request.cookies.get(SESSION_COOKIE_NAME);
    if (!cookie || !verifySession(cookie.value)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: '/api/admin/:path*',
};
