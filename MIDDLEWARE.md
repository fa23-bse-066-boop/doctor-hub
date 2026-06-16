# DoctorHub Middleware - Route Protection & Role-Based Access Control

## Overview

The Next.js middleware (`middleware.ts`) runs on **EVERY request** before it reaches pages or API routes, providing centralized authentication and authorization.

## Features Implemented

✅ **Authentication Check** - Validates JWT tokens from cookies
✅ **Role-Based Access Control (RBAC)** - Restricts routes by user role
✅ **Public Routes** - Allows unauthenticated access to login, register, etc.
✅ **API vs Page Handling** - Returns JSON for API routes, redirects for pages
✅ **Token Validation** - Verifies JWT signature and expiration
✅ **Cookie Cleanup** - Removes invalid tokens automatically
✅ **Request Headers** - Passes user info to route handlers
✅ **Return URL** - Preserves destination after login

---

## Route Access Matrix

| Route Prefix | Allowed Roles | Example URLs |
|--------------|---------------|--------------|
| `/patient` | PATIENT | `/patient/dashboard`, `/patient/appointments` |
| `/doctor` | DOCTOR | `/doctor/dashboard`, `/doctor/clinics` |
| `/assistant` | ASSISTANT | `/assistant/dashboard`, `/assistant/payments` |
| `/admin` | ADMIN, SUPER_ADMIN | `/admin/users`, `/admin/logs` |
| `/super-admin` | SUPER_ADMIN | `/super-admin/dashboard` |

---

## Public Routes (No Auth Required)

The following routes are accessible without authentication:

- `/` - Home page
- `/login` - Login page
- `/register` - Registration page
- `/forgot-password` - Forgot password page
- `/reset-password` - Reset password page
- `/unauthorized` - 403 error page
- `/api/auth/*` - All authentication API endpoints

---

## Middleware Flow

```
┌─────────────────────────────────────────────────┐
│ 1. Request Received                              │
│    Extract pathname from request                 │
└───────────────┬─────────────────────────────────┘
                ↓
┌─────────────────────────────────────────────────┐
│ 2. Check if Public Route                        │
│    - Is pathname in PUBLIC_ROUTES?              │
│    - Does pathname start with /api/auth/?       │
└───────────────┬─────────────────────────────────┘
                ↓
         ┌──────┴──────┐
         │             │
    YES  │             │  NO
         ↓             ↓
   ┌─────────┐   ┌──────────────────────────────┐
   │ Allow   │   │ 3. Get JWT Token from Cookie │
   │ Request │   │    cookie: 'doctor_hub_token' │
   └─────────┘   └──────────────┬───────────────┘
                                ↓
                  ┌─────────────┴──────────────┐
                  │                            │
             NO TOKEN                       HAS TOKEN
                  ↓                            ↓
         ┌────────────────┐         ┌──────────────────┐
         │ 4a. No Auth    │         │ 4b. Verify Token │
         │ API? → 401 JSON│         │ verifyToken()    │
         │ Page? → /login │         └──────┬───────────┘
         └────────────────┘                 ↓
                               ┌────────────┴────────────┐
                               │                         │
                          INVALID                     VALID
                               ↓                         ↓
                  ┌────────────────────┐    ┌──────────────────────┐
                  │ 5a. Invalid Token  │    │ 5b. Check Role-Based │
                  │ Clear cookie       │    │     Access Control   │
                  │ API? → 401 JSON    │    └──────┬───────────────┘
                  │ Page? → /login     │           ↓
                  └────────────────────┘    ┌──────┴────────┐
                                            │               │
                                       NO MATCH        MATCHES PREFIX
                                            │               ↓
                                            │    ┌──────────────────┐
                                            │    │ Check if role in │
                                            │    │  allowedRoles[]  │
                                            │    └──────┬───────────┘
                                            │           ↓
                                            │    ┌──────┴───────┐
                                            │    │              │
                                            │   NO            YES
                                            │    ↓              │
                                            │ ┌────────────┐   │
                                            │ │6a. Forbidden│   │
                                            │ │API? → 403  │   │
                                            │ │Page? → 403 │   │
                                            │ └────────────┘   │
                                            │                  │
                                            └──────────┬───────┘
                                                       ↓
                                            ┌──────────────────┐
                                            │ 6b. Add Headers  │
                                            │ x-user-id        │
                                            │ x-user-email     │
                                            │ x-user-role      │
                                            └────────┬─────────┘
                                                     ↓
                                            ┌────────────────┐
                                            │ 7. Allow       │
                                            │    Request     │
                                            └────────────────┘
```

---

## Response Types

### For API Routes (`/api/*`)

**401 Unauthorized (No Token or Invalid Token):**
```json
{
  "error": "Authentication required"
}
```

**403 Forbidden (Wrong Role):**
```json
{
  "error": "Forbidden. Insufficient permissions."
}
```

### For Page Routes

**401 Unauthorized:**
- Redirect to `/login?returnUrl={original_path}`
- Example: Accessing `/doctor/dashboard` without login → `/login?returnUrl=/doctor/dashboard`

**403 Forbidden:**
- Redirect to `/unauthorized`
- Example: PATIENT trying to access `/doctor/dashboard` → `/unauthorized`

---

## Request Headers Added

For authenticated requests, the middleware adds these headers:

| Header | Description | Example |
|--------|-------------|---------|
| `x-user-id` | User's unique ID | `cuid123abc` |
| `x-user-email` | User's email | `user@example.com` |
| `x-user-role` | User's role | `PATIENT`, `DOCTOR`, etc. |

**Usage in API Routes:**

```typescript
import { headers } from 'next/headers';

export async function GET() {
  const headersList = await headers();
  const userId = headersList.get('x-user-id');
  const userRole = headersList.get('x-user-role');
  
  // Use userId and userRole without re-verifying JWT
  // ...
}
```

---

## Edge Runtime Compatibility

⚠️ **IMPORTANT:** Middleware runs in the **Edge Runtime**, not Node.js runtime.

**Allowed:**
- ✅ `jose` library for JWT verification
- ✅ Reading cookies from request
- ✅ HTTP redirects and responses
- ✅ Request/response header manipulation

**NOT Allowed:**
- ❌ Prisma ORM (Node.js only)
- ❌ bcryptjs (Node.js only)
- ❌ File system operations
- ❌ Database connections

---

## Cookie Configuration

**Cookie Name:** `doctor_hub_token`

**Cookie Properties:**
- `httpOnly: true` - Prevents JavaScript access (XSS protection)
- `secure: true` - HTTPS only in production
- `sameSite: 'strict'` - CSRF protection
- `maxAge: 7 days` - Token expiration
- `path: /` - Available across entire site

---

## Matcher Configuration

The middleware runs on routes matching this pattern:

```typescript
matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)',]
```

**Excluded from middleware:**
- `/_next/static/*` - Next.js static assets
- `/_next/image/*` - Next.js image optimization
- `/favicon.ico` - Favicon
- `/public/*` - Public static files

---

## Security Features

### 1. Token Validation
- JWT signature verification using `jose` library
- Expiration check (7-day token lifetime)
- Invalid tokens are removed from cookies

### 2. Anti-Enumeration
- No difference in response time between valid/invalid tokens
- Generic error messages don't reveal user existence

### 3. Role-Based Access
- Fine-grained control per route prefix
- Prevents privilege escalation
- Explicit allow-list (not deny-list)

### 4. Cookie Security
- HTTP-only cookies prevent XSS attacks
- Strict SameSite prevents CSRF attacks
- Secure flag in production (HTTPS only)

### 5. Return URL Preservation
- Login redirects back to original destination
- Improves user experience
- Example: `/doctor/dashboard` → login → `/doctor/dashboard`

---

## Testing the Middleware

### Test Case 1: Public Route Access
```bash
curl http://localhost:3000/login
# Expected: 200 OK, login page
```

### Test Case 2: Protected Route Without Token
```bash
curl http://localhost:3000/doctor/dashboard
# Expected: 302 Redirect to /login?returnUrl=/doctor/dashboard
```

### Test Case 3: API Route Without Token
```bash
curl http://localhost:3000/api/doctors
# Expected: 401 JSON { "error": "Authentication required" }
```

### Test Case 4: Wrong Role
```bash
# Login as PATIENT, try to access /doctor/dashboard
# Expected: 302 Redirect to /unauthorized
```

### Test Case 5: Valid Token & Role
```bash
# Login as DOCTOR, access /doctor/dashboard
# Expected: 200 OK, dashboard page
```

---

## Adding New Role-Based Routes

To add a new protected route:

1. **Update `ROLE_ROUTES` in `middleware.ts`:**

```typescript
const ROLE_ROUTES: Record<string, string[]> = {
  '/patient': ['PATIENT'],
  '/doctor': ['DOCTOR'],
  '/assistant': ['ASSISTANT'],
  '/admin': ['ADMIN', 'SUPER_ADMIN'],
  '/super-admin': ['SUPER_ADMIN'],
  '/pharmacy': ['PHARMACY_ADMIN', 'ADMIN'],  // ← New route
};
```

2. **Create the route folder:**
```
app/pharmacy/
  └── page.tsx
```

3. **Middleware automatically protects it** - No additional changes needed!

---

## Troubleshooting

### Issue: Middleware Not Running

**Symptoms:** Routes accessible without authentication

**Causes:**
- Route path excluded by matcher config
- Middleware file not at project root
- Next.js cache not cleared

**Solution:**
```bash
rm -rf .next
npm run dev
```

### Issue: Infinite Redirect Loop

**Symptoms:** Browser shows "too many redirects"

**Causes:**
- Protected route redirects to another protected route
- Login page is not in `PUBLIC_ROUTES`

**Solution:** Ensure `/login` is in `PUBLIC_ROUTES` array

### Issue: "Edge Runtime" Errors

**Symptoms:** `Module not found` or `dynamic require`

**Causes:**
- Importing Node.js-only libraries (Prisma, bcryptjs)
- Using file system operations

**Solution:** Remove Node.js imports from middleware. Use only Edge-compatible code.

### Issue: Token Valid But Still Redirects

**Symptoms:** User logged in but can't access routes

**Causes:**
- Token doesn't contain required fields (`userId`, `email`, `role`)
- JWT secret mismatch

**Solution:** 
1. Check JWT payload structure
2. Verify `JWT_SECRET` environment variable

---

## Performance Considerations

### Middleware Execution Time

- **Target:** < 50ms per request
- **Edge Runtime:** Fast execution (no cold starts)
- **JWT Verification:** ~5-10ms

### Optimization Tips

1. **Avoid Database Calls** - Middleware should not query DB
2. **Cache Static Routes** - Use Next.js caching for public routes
3. **Minimize Token Size** - Keep JWT payload small
4. **Use Edge Locations** - Deploy to edge for global low latency

---

## Environment Variables

Required environment variables:

```env
# JWT Secret (min 32 characters)
JWT_SECRET=your-secret-key-here-minimum-32-characters-long

# App URL (for redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Summary

| Feature | Status | Details |
|---------|--------|---------|
| Authentication | ✅ | JWT token verification |
| Authorization | ✅ | Role-based access control |
| Public Routes | ✅ | Login, register, etc. |
| API Protection | ✅ | Returns JSON errors |
| Page Protection | ✅ | Redirects to login |
| Cookie Security | ✅ | HTTP-only, Secure, SameSite |
| User Headers | ✅ | x-user-id, x-user-role, etc. |
| Edge Runtime | ✅ | Fast, global execution |

**Middleware is production-ready and provides comprehensive route protection!** 🎉
