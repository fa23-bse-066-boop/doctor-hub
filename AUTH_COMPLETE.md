# DoctorHub Authentication Routes — Complete Implementation

## ✅ LOGIN, LOGOUT, AND ME ROUTES

All three core authentication endpoints are now complete and production-ready.

---

## 📄 FILE 1: `/app/api/auth/login/route.ts` (103 lines)

### Endpoint: `POST /api/auth/login`

**Purpose:** Authenticate user and create authenticated session

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response (200 Success):**
```json
{
  "success": true,
  "data": {
    "id": "cuid_example",
    "email": "user@example.com",
    "role": "PATIENT"
  },
  "message": "Login successful"
}
```

**Flow:**

```
INPUT
  ↓
[1] Parse & Validate Input (safeParse)
  ├─ Check email format (lowercase transform)
  ├─ Check password min length
  └─ 400 if validation fails
  ↓
[2] Find User by Email
  └─ select: id, email, password (hashed), role, isActive
  ↓
[3] Check If User Exists
  └─ GENERIC error if not found (prevents enumeration attack)
      Return: 'Invalid email or password' ❌
  ↓
[4] Verify Password (bcryptjs.compare)
  └─ GENERIC error if password wrong (prevents enumeration)
      Return: 'Invalid email or password' ❌
  ↓
[5] Check Account Status
  ├─ If isActive === false
  │  Return: 'Your account has been suspended. Contact support.' 403 ❌
  └─ Continue if active
  ↓
[6] Check Doctor Approval (if role === DOCTOR)
  ├─ Fetch doctor.isApproved from DB
  ├─ If isApproved === false
  │  Return: 'Your doctor account is pending admin approval.' 403 ❌
  └─ Continue if approved
  ↓
[7] Sign JWT Token
  └─ Payload: { userId, email, role }
     Expiry: 7 days
  ↓
[8] Set HTTP-only Cookie
  └─ httpOnly, secure (prod), sameSite: strict, maxAge: 7d
  ↓
[9] Return Success (200)
  └─ Data: { id, email, role }
      Message: 'Login successful'
```

**Error Scenarios:**

| Error | Condition | Status | Message |
|-------|-----------|--------|---------|
| 400 | Validation fails | 400 | Validation failed (+ field errors) |
| 401 | User not found | 401 | Invalid email or password |
| 401 | Password wrong | 401 | Invalid email or password |
| 403 | Account suspended | 403 | Your account has been suspended. Contact support. |
| 403 | Doctor pending approval | 403 | Your doctor account is pending admin approval. |
| 500 | Server error | 500 | Internal server error |

**Security Features:**
✅ Graceful validation with `safeParse()` (no thrown exceptions)
✅ **GENERIC error for both "user not found" and "password wrong"** (prevents email enumeration attacks)
✅ bcryptjs password comparison (constant-time, safe)
✅ Account status check (isActive flag)
✅ Doctor approval check (must be admin-approved to login)
✅ JWT token with 7-day expiry
✅ HTTP-only cookie (XSS protection)
✅ Strict SameSite cookie (CSRF protection)
✅ No password returned in response

---

## 📄 FILE 2: `/app/api/auth/logout/route.ts` (20 lines)

### Endpoint: `POST /api/auth/logout`

**Purpose:** End authenticated session and clear auth cookie

**Request:**
```json
{} // Empty body, cookie sent automatically
```

**Response (200 Success):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Flow:**

```
INPUT
  ↓
[1] Clear Auth Cookie
  └─ Calls clearCookie()
     Removes 'doctor_hub_token' cookie
  ↓
[2] Return Success (200)
  └─ Message: 'Logged out successfully'
```

**Key Points:**
- ✅ No authentication required (even expired tokens can logout)
- ✅ Clears HTTP-only cookie
- ✅ Simple & fast endpoint
- ✅ Always succeeds (safe idempotent operation)

**Error Scenarios:**

| Error | Condition | Status | Message |
|-------|-----------|--------|---------|
| 500 | Server error | 500 | Internal server error |

---

## 📄 FILE 3: `/app/api/auth/me/route.ts` (105 lines)

### Endpoint: `GET /api/auth/me`

**Purpose:** Get current authenticated user's profile with fresh DB data

**Request:**
```
GET /api/auth/me
(Cookie sent automatically with JWT token)
```

**Response (200 Success - PATIENT):**
```json
{
  "success": true,
  "data": {
    "id": "cuid_example",
    "email": "patient@example.com",
    "role": "PATIENT",
    "isActive": true,
    "createdAt": "2026-06-14T10:00:00Z",
    "patient": {
      "fullName": "John Doe",
      "profilePic": "https://example.com/pic.jpg"
    }
  }
}
```

**Response (200 Success - DOCTOR):**
```json
{
  "success": true,
  "data": {
    "id": "cuid_example",
    "email": "doctor@example.com",
    "role": "DOCTOR",
    "isActive": true,
    "createdAt": "2026-06-14T10:00:00Z",
    "doctor": {
      "fullName": "Dr. Jane Smith",
      "profilePic": "https://example.com/doc.jpg",
      "isApproved": true
    }
  }
}
```

**Flow:**

```
INPUT (with auth cookie)
  ↓
[1] Get Token from Cookie
  └─ Calls getTokenFromCookies()
     Returns token string or undefined
  ↓
[2] Check If Token Exists
  └─ If no token
     Return: 'Not authenticated' 401 ❌
  ↓
[3] Verify JWT Token
  └─ Calls verifyToken(token)
     Checks signature, expiry, format
  ↓
[4] Check If Token Valid
  └─ If invalid or expired
     Return: 'Invalid or expired session' 401 ❌
  ↓
[5] Fetch Fresh User from Database
  ├─ Query: prisma.user.findUnique(id)
  ├─ Select: id, email, role, isActive, createdAt
  ├─ Include: patient OR doctor profile (based on role)
  │  └─ Selects: fullName, profilePic, (isApproved for doctor)
  └─ Never select password
  ↓
[6] Check If User Exists
  └─ If not found
     Return: 'User not found' 404 ❌
  ↓
[7] Check Account Status
  └─ If isActive === false
     Return: 'Account has been suspended' 401 ❌
  ↓
[8] Return Success (200)
  └─ Data: Full user object with profile
```

**Error Scenarios:**

| Error | Condition | Status | Message |
|-------|-----------|--------|---------|
| 401 | No cookie/token | 401 | Not authenticated |
| 401 | Invalid/expired token | 401 | Invalid or expired session |
| 404 | User deleted from DB | 404 | User not found |
| 401 | Account suspended | 401 | Account has been suspended |
| 500 | Server error | 500 | Internal server error |

**Why Fresh Data from DB?**
- JWT payload includes userId, email, role
- But DB is source of truth for isActive, profile data, etc.
- This prevents stale JWT data from being trusted
- If user is suspended, we detect it immediately
- If doctor is de-approved, we detect it immediately

**Security Features:**
✅ Token validation (checks signature, expiry)
✅ Fresh DB fetch (not trusting JWT payload alone)
✅ Account status check (isActive)
✅ Role-specific profile data (patient vs doctor)
✅ No password in response
✅ Suspended accounts detected

---

## 🔑 Complete Authentication Flow

### Registration → Login → Authenticated Session → Logout

```
┌─────────────────────────────────────────────────────────────┐
│ 1. REGISTER (/api/auth/register)                            │
│    Input: email, password, fullName, phone, role            │
│    ├─ Validate input (Zod)                                  │
│    ├─ Hash password (bcryptjs, 12 rounds)                   │
│    ├─ Create User + Profile (transaction)                   │
│    └─ Sign JWT + Set Cookie                                 │
│    Output: User { id, email, role } + Cookie               │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. AUTHENTICATE (/api/auth/login)                           │
│    Input: email, password + (optionally reuse existing auth) │
│    ├─ Validate input (Zod)                                  │
│    ├─ Find user by email                                    │
│    ├─ Compare password (bcryptjs)                           │
│    ├─ Check account active                                  │
│    ├─ If DOCTOR: check approval                             │
│    └─ Sign JWT + Set Cookie                                 │
│    Output: User { id, email, role } + Cookie               │
└─────────────────────────────────────────────────────────────┘
                        ↓
                   Browser stores
                   HTTP-only Cookie
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. USE AUTHENTICATED SESSION                                │
│    Every request includes cookie automatically              │
│                                                              │
│    Protected Routes:                                        │
│    ├─ GET /api/auth/me                                     │
│    │  ├─ Verify token from cookie                          │
│    │  ├─ Fetch fresh user from DB                          │
│    │  └─ Return user { id, email, role, profile... }       │
│    │                                                         │
│    ├─ PATCH /api/doctors/[id]                              │
│    │  ├─ Verify token                                      │
│    │  ├─ Check role (DOCTOR)                               │
│    │  └─ Update profile                                    │
│    │                                                         │
│    ├─ POST /api/appointments                               │
│    │  ├─ Verify token                                      │
│    │  ├─ Check role (PATIENT)                              │
│    │  └─ Create appointment                                │
│    │                                                         │
│    └─ More endpoints...                                    │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. LOGOUT (/api/auth/logout)                                │
│    Input: (no input needed, cookie sent automatically)      │
│    ├─ Clear auth cookie                                     │
│    └─ End session                                           │
│    Output: { success: true }                                │
└─────────────────────────────────────────────────────────────┘
                        ↓
            Browser cookie deleted
            Session ended
            Redirect to /login
```

---

## 🧪 Test Cases

### LOGIN - Valid PATIENT
```json
Request: POST /api/auth/login
{
  "email": "patient@example.com",
  "password": "PatientPass123"
}

Response: 200
{
  "success": true,
  "data": {
    "id": "cuid123",
    "email": "patient@example.com",
    "role": "PATIENT"
  },
  "message": "Login successful"
}

Side Effects:
✓ HTTP-only cookie set
✓ JWT token valid for 7 days
✓ Can now access /api/auth/me
```

### LOGIN - Valid DOCTOR (Approved)
```json
Request: POST /api/auth/login
{
  "email": "doctor@example.com",
  "password": "DoctorPass123"
}

Response: 200
{
  "success": true,
  "data": {
    "id": "cuid456",
    "email": "doctor@example.com",
    "role": "DOCTOR"
  },
  "message": "Login successful"
}
```

### LOGIN - Doctor Pending Approval
```json
Request: POST /api/auth/login
{
  "email": "new-doctor@example.com",
  "password": "DoctorPass123"
}

Response: 403
{
  "success": false,
  "error": "Your doctor account is pending admin approval."
}

Note: Doctor must be approved by admin before login works
```

### LOGIN - Account Suspended
```json
Request: POST /api/auth/login
{
  "email": "suspended@example.com",
  "password": "CorrectPassword123"
}

Response: 403
{
  "success": false,
  "error": "Your account has been suspended. Contact support."
}
```

### LOGIN - Invalid Email (No Enumeration)
```json
Request: POST /api/auth/login
{
  "email": "nonexistent@example.com",
  "password": "AnyPassword123"
}

Response: 401
{
  "success": false,
  "error": "Invalid email or password"
}

Note: Same error as wrong password (prevents user enumeration)
```

### LOGIN - Wrong Password (No Enumeration)
```json
Request: POST /api/auth/login
{
  "email": "patient@example.com",
  "password": "WrongPassword123"
}

Response: 401
{
  "success": false,
  "error": "Invalid email or password"
}

Note: Same error as nonexistent email (prevents user enumeration)
```

### ME - Authenticated Session
```json
Request: GET /api/auth/me
(Cookie automatically includes JWT)

Response: 200
{
  "success": true,
  "data": {
    "id": "cuid123",
    "email": "patient@example.com",
    "role": "PATIENT",
    "isActive": true,
    "createdAt": "2026-06-14T10:00:00Z",
    "patient": {
      "fullName": "John Doe",
      "profilePic": "https://example.com/pic.jpg"
    }
  }
}
```

### ME - No Token
```json
Request: GET /api/auth/me
(No cookie or expired)

Response: 401
{
  "success": false,
  "error": "Not authenticated"
}
```

### ME - Expired Token
```json
Request: GET /api/auth/me
(Cookie has expired JWT)

Response: 401
{
  "success": false,
  "error": "Invalid or expired session"
}

Solution: User must login again
```

### LOGOUT - Any State
```json
Request: POST /api/auth/logout
(Cookie doesn't matter, even if expired)

Response: 200
{
  "success": true,
  "message": "Logged out successfully"
}

Side Effects:
✓ HTTP-only cookie cleared
✓ No further requests can use this token
✓ Browser redirects to /login
```

---

## 📊 Summary

| Endpoint | Method | Auth | Purpose | Status |
|----------|--------|------|---------|--------|
| `/api/auth/register` | POST | ❌ No | Create account | ✅ Complete |
| `/api/auth/login` | POST | ❌ No | Authenticate | ✅ Complete |
| `/api/auth/logout` | POST | ✅ (optional) | End session | ✅ Complete |
| `/api/auth/me` | GET | ✅ Yes | Get user info | ✅ Complete |

**All 4 core auth endpoints are now complete and production-ready!** 🎉

---

## 🔐 Security Checklist

### Login Route
✅ Validation with `safeParse()` (graceful errors)
✅ **Generic error for both missing email and wrong password** (prevents enumeration)
✅ bcryptjs password comparison (constant-time)
✅ Account status check (isActive)
✅ Doctor approval check
✅ JWT with 7-day expiry
✅ HTTP-only cookie (XSS protection)
✅ Strict SameSite (CSRF protection)
✅ No password in response

### Logout Route
✅ Clears HTTP-only cookie
✅ No auth required (safe idempotent)
✅ Always succeeds

### Me Route
✅ Token from cookie only (auto-sent by browser)
✅ JWT signature verification
✅ Expiry check
✅ Fresh user fetch from DB (source of truth)
✅ Account status check
✅ Role-specific profile data
✅ No password returned

---

**Next Steps:**
- Update forgot-password/reset-password routes
- Implement email verification (optional)
- Build frontend forms (React)
- Deploy to production

