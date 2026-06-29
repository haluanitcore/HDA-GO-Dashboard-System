import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register', '/_next', '/icon.png', '/favicon.ico'];

const ROLE_ROUTES: Record<string, string[]> = {
  '/admin': ['ADMIN'],
  '/qc': ['QC', 'CM', 'ADMIN'],
  '/bd': ['BD', 'ADMIN'],
  '/cm': ['CM', 'ADMIN'],
  '/brand': ['BRAND', 'ADMIN'],
  '/executive': ['ADMIN'],
  '/settings': ['QC', 'CM', 'ADMIN', 'BD', 'BRAND', 'CREATOR'],
};

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const accessToken = req.cookies.get('accessToken')?.value;

  if (!accessToken) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Decode JWT payload (tidak verifikasi signature — verifikasi ada di backend)
  // Hanya digunakan untuk routing decision server-side
  try {
    const [, payloadB64] = accessToken.split('.');
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    const role: string = payload.role ?? '';

    for (const [route, allowedRoles] of Object.entries(ROLE_ROUTES)) {
      if (pathname.startsWith(route) && !allowedRoles.includes(role)) {
        const dashboardUrl = req.nextUrl.clone();
        dashboardUrl.pathname = '/dashboard';
        return NextResponse.redirect(dashboardUrl);
      }
    }
  } catch {
    // Token malformed — arahkan ke login
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
