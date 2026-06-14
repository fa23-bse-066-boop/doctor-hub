# DoctorHub API Routes Documentation

## ✅ IMPLEMENTED ROUTES

### Authentication Routes (6 endpoints)

#### POST /api/auth/register
- **Auth Required:** No
- **Roles:** Public (PATIENT, DOCTOR)
- **Description:** Register new user (Patient or Doctor)
- **Request:**
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePass123",
    "fullName": "John Doe",
    "role": "PATIENT" | "DOCTOR"
  }
  ```
- **Response:** { success: true, data: { id, email, role, isActive } }

#### POST /api/auth/login
- **Auth Required:** No
- **Description:** Login user and set HTTP-only cookie
- **Request:**
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePass123"
  }
  ```
- **Response:** { success: true, data: { id, email, role, isActive } }

#### POST /api/auth/logout
- **Auth Required:** Yes
- **Description:** Logout and clear auth cookie
- **Response:** { success: true }

#### GET /api/auth/me
- **Auth Required:** Yes
- **Description:** Get current authenticated user
- **Response:** { success: true, data: { id, email, role, isActive } }

#### POST /api/auth/forgot-password (STUB)
- **Auth Required:** No
- **Description:** Request password reset email
- **Pending:** Email integration with Resend

#### POST /api/auth/reset-password (STUB)
- **Auth Required:** No
- **Description:** Reset password with token
- **Pending:** Token verification implementation

---

### Doctor Routes (2 endpoints)

#### GET /api/doctors
- **Auth Required:** No
- **Description:** List all approved doctors with search/filter
- **Query Parameters:**
  - `specialization`: Filter by specialization
  - `treatmentType`: Filter by treatment type (ALLOPATHIC, HOMEOPATHIC, HERBAL)
  - `isApproved`: true/false
- **Response:** 
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "cuid",
        "fullName": "Dr. Smith",
        "specialization": "Cardiology",
        "treatmentTypes": ["ALLOPATHIC"],
        "experience": 5,
        "clinics": [{ "id", "name", "city", "fee" }]
      }
    ]
  }
  ```

#### PATCH /api/doctors/[id]
- **Auth Required:** Yes
- **Roles:** Own doctor profile or ADMIN/SUPER_ADMIN
- **Description:** Update doctor profile
- **Request:**
  ```json
  {
    "fullName": "Dr. John Smith",
    "specialization": "Cardiology",
    "treatmentTypes": ["ALLOPATHIC"],
    "diseases": ["Heart Disease"],
    "experience": 5,
    "qualifications": ["MBBS", "MD"]
  }
  ```
- **Response:** { success: true, data: { ...doctor } }

---

### Appointment Routes (2 endpoints)

#### GET /api/appointments
- **Auth Required:** Yes
- **Roles:** PATIENT, DOCTOR, ADMIN, SUPER_ADMIN
- **Description:** Get user's appointments (filtered by role)
- **Query Parameters:**
  - `status`: Filter by appointment status
- **Behavior:**
  - PATIENT: Gets own appointments
  - DOCTOR: Gets own appointments
  - ADMIN/SUPER_ADMIN: Gets all appointments
- **Response:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "cuid",
        "dateTime": "2026-06-20T10:30:00Z",
        "status": "CONFIRMED",
        "patient": { "fullName", "phone" },
        "doctor": { "fullName", "specialization" },
        "clinic": { "name", "city" }
      }
    ]
  }
  ```

#### POST /api/appointments
- **Auth Required:** Yes
- **Roles:** PATIENT only
- **Description:** Book new appointment
- **Request:**
  ```json
  {
    "doctorId": "cuid",
    "clinicId": "cuid",
    "dateTime": "2026-06-20T10:30:00Z",
    "patientNotes": "I have chest pain"
  }
  ```
- **Response:** { success: true, data: { id, dateTime, status, clinic, doctor } }
- **Validations:**
  - Doctor must be approved
  - Time slot must not be already booked
  - Unique constraint: doctorId + clinicId + dateTime

---

### Payment Routes (2 endpoints)

#### POST /api/payments
- **Auth Required:** Yes
- **Roles:** PATIENT only
- **Description:** Upload payment screenshot
- **Request:**
  ```json
  {
    "appointmentId": "cuid",
    "screenshotUrl": "https://example.com/payment.png",
    "amount": 500.00
  }
  ```
- **Response:** { success: true, data: { id, amount, status: "PENDING", createdAt } }
- **Auto-Updates:** Appointment status → PAYMENT_UPLOADED

#### PATCH /api/payments/[id]
- **Auth Required:** Yes
- **Roles:** ASSISTANT, ADMIN, SUPER_ADMIN
- **Description:** Verify or reject payment
- **Request:**
  ```json
  {
    "status": "VERIFIED" | "REJECTED",
    "rejectionReason": "Invalid screenshot"
  }
  ```
- **Response:** { success: true, data: { id, status, amount } }
- **Auto-Updates:** 
  - If VERIFIED: Appointment status → PAYMENT_VERIFIED
  - Verified by Assistant is recorded

---

### Prescription Routes (2 endpoints)

#### GET /api/prescriptions/[appointmentId]
- **Auth Required:** Yes
- **Roles:** PATIENT (own), DOCTOR, ADMIN, SUPER_ADMIN
- **Description:** Get prescription for appointment (IMMUTABLE)
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "id": "cuid",
      "medicines": [
        {
          "name": "Aspirin",
          "dosage": "100mg",
          "frequency": "Once daily",
          "duration": "7 days"
        }
      ],
      "instructions": "Take with food",
      "followUpDate": "2026-07-01",
      "createdAt": "2026-06-20T10:00:00Z"
    }
  }
  ```

#### POST /api/prescriptions
- **Auth Required:** Yes
- **Roles:** DOCTOR only
- **Description:** Create prescription for completed appointment
- **Request:**
  ```json
  {
    "appointmentId": "cuid",
    "medicines": [
      {
        "name": "Aspirin",
        "dosage": "100mg",
        "frequency": "Once daily",
        "duration": "7 days",
        "instructions": "Take with food"
      }
    ],
    "instructions": "Follow up in 1 week",
    "followUpDate": "2026-07-01"
  }
  ```
- **Response:** { success: true, data: { id, medicines, createdAt } }
- **Immutable:** No updates after creation

---

### Medical History Routes (2 endpoints)

#### GET /api/medical-history
- **Auth Required:** Yes
- **Roles:** PATIENT, DOCTOR, ADMIN, SUPER_ADMIN
- **Description:** Get medical history records (IMMUTABLE)
- **Behavior:**
  - PATIENT: Gets own medical history
  - DOCTOR: Gets records they added
  - ADMIN/SUPER_ADMIN: Gets all
- **Response:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "cuid",
        "diagnosis": "Hypertension",
        "doctorNotes": "Patient shows elevated BP",
        "createdAt": "2026-06-20T10:00:00Z",
        "doctor": { "fullName" }
      }
    ]
  }
  ```

#### POST /api/medical-history
- **Auth Required:** Yes
- **Roles:** DOCTOR only
- **Description:** Add medical history record
- **Request:**
  ```json
  {
    "appointmentId": "cuid",
    "diagnosis": "Hypertension",
    "doctorNotes": "Patient shows elevated BP"
  }
  ```
- **Response:** { success: true, data: { id, diagnosis, createdAt } }
- **Immutable:** No updates after creation

---

### Admin Routes (3 endpoints)

#### GET /api/admin/logs
- **Auth Required:** Yes
- **Roles:** ADMIN, SUPER_ADMIN only
- **Description:** View admin activity logs
- **Query Parameters:**
  - `limit`: Number of logs (default: 50)
  - `offset`: Pagination offset (default: 0)
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "logs": [
        {
          "id": "cuid",
          "action": "User status updated",
          "targetId": "cuid",
          "details": { ...},
          "createdAt": "2026-06-20T10:00:00Z",
          "user": { "email", "role" }
        }
      ],
      "pagination": { "total": 150, "limit": 50, "offset": 0 }
    }
  }
  ```

#### GET /api/admin/users
- **Auth Required:** Yes
- **Roles:** ADMIN, SUPER_ADMIN only
- **Description:** List all users
- **Query Parameters:**
  - `role`: Filter by role
  - `limit`: Number of users (default: 50)
- **Response:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "cuid",
        "email": "user@example.com",
        "role": "PATIENT",
        "isActive": true,
        "createdAt": "2026-06-20T10:00:00Z"
      }
    ]
  }
  ```

#### PATCH /api/admin/users/[id]
- **Auth Required:** Yes
- **Roles:** ADMIN, SUPER_ADMIN only
- **Description:** Update user status (activate/deactivate)
- **Request:**
  ```json
  {
    "isActive": false
  }
  ```
- **Response:** { success: true, data: { id, email, role, isActive } }
- **Auto-Logs:** Action logged to AdminLog

---

## ⏳ REMAINING ROUTES (TO IMPLEMENT)

### Clinic Routes (Need to Create)
- GET `/api/clinics` - List clinics
- GET `/api/clinics/[id]` - Get clinic details
- POST `/api/clinics` - Create clinic (doctor only)
- PATCH `/api/clinics/[id]` - Update clinic (doctor only)
- DELETE `/api/clinics/[id]` - Delete clinic (doctor only)

### Schedule Routes (Need to Create)
- GET `/api/schedules/clinic/[clinicId]` - Get schedule for clinic
- POST `/api/schedules` - Create schedule (doctor only)
- PATCH `/api/schedules/[id]` - Update schedule (doctor only)

### Blocked Dates Routes (Need to Create)
- GET `/api/blocked-dates/[doctorId]` - Get blocked dates
- POST `/api/blocked-dates` - Create blocked date (doctor only)

### Appointment Status Update (Need to Create)
- PATCH `/api/appointments/[id]/status` - Update appointment status

---

## 🔐 Authentication Pattern

All protected routes use:

```typescript
// Get current user
const user = await getCurrentUser();

// Require authentication
const user = await requireAuth();

// Require specific roles
const user = await requireRole(['PATIENT', 'DOCTOR']);
```

---

## 📊 Response Format

All API responses follow this format:

```typescript
{
  success: boolean;
  data?: any;
  error?: string;
}
```

---

## 🛡️ Error Handling

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (not authenticated) |
| 403 | Forbidden (authenticated but no permission) |
| 404 | Not Found |
| 409 | Conflict (duplicate, e.g., double-booked) |
| 500 | Server Error |

---

## 📝 Implemented Routes Summary

**Total Implemented:** 15 endpoints
**Total Remaining:** 15 endpoints
**Progress:** 50% complete

