import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';

const COOKIE_NAME = 'doctor_hub_token';

// Role-based route access control
const ROLE_ROUTES: Record<string, string[]> = {
  '/patient': ['PATIENT'],
  '/doctor': ['DOCTOR'],
  '/assistant': ['ASSISTANT'],
  '/admin': ['ADMIN', 'SUPER_ADMIN'],
  '/super-admin': ['SUPER_ADMIN'],
};

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/unauthorized',
];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Check if route is public
  const isPublicRoute =
    PUBLIC_ROUTES.includes(pathname) || pathname.startsWith('/api/auth/');

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Get JWT token from cookies
  const token = request.cookies.get(COOKIE_NAME)?.value;

  // No token - redirect to login or return 401 for API routes
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    return NextResponse.redirect(
      new URL(`/login?returnUrl=${pathname}`, request.url)
    );
  }

  // Verify token
  const payload = await verifyToken(token);

  // Invalid or expired token
  if (!payload) {
    const response = pathname.startsWith('/api/')
      ? NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      : NextResponse.redirect(new URL('/login', request.url));

    // Clear invalid cookie
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  // Check role-based access
  for (const [routePrefix, allowedRoles] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(routePrefix)) {
      if (!allowedRoles.includes(payload.role)) {
        // User doesn't have required role
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            { error: 'Forbidden. Insufficient permissions.' },
            { status: 403 }
          );
        }
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }
    }
  }

  // Add user info to request headers for route handlers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', payload.userId);
  requestHeaders.set('x-user-email', payload.email);
  requestHeaders.set('x-user-role', payload.role);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
