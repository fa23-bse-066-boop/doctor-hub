import { z } from 'zod';

// ============================================================================
// DOCTOR SCHEMAS
// ============================================================================

export const createDoctorProfileSchema = z.object({
  fullName: z.string().min(2, 'Full name required'),
  phone: z.string().optional(),
  specialization: z.string().min(2, 'Specialization required'),
  treatmentTypes: z.array(z.enum(['ALLOPATHIC', 'HOMEOPATHIC', 'HERBAL'])).min(1),
  diseases: z.array(z.string()).min(1, 'At least one disease required'),
  qualifications: z.array(z.string()).min(1, 'At least one qualification required'),
  experience: z.number().int().min(0, 'Experience must be non-negative'),
  bio: z.string().optional(),
  certificates: z.array(z.string()).optional(),
});

export const updateDoctorProfileSchema = createDoctorProfileSchema.partial();

export type CreateDoctorProfileInput = z.infer<typeof createDoctorProfileSchema>;
export type UpdateDoctorProfileInput = z.infer<typeof updateDoctorProfileSchema>;

// ============================================================================
// CLINIC SCHEMAS
// ============================================================================

export const createClinicSchema = z.object({
  name: z.string().min(2, 'Clinic name required'),
  address: z.string().min(5, 'Address required'),
  city: z.string().min(2, 'City required'),
  phone: z.string().optional(),
  fee: z.number().positive('Fee must be positive'),
});

export const updateClinicSchema = createClinicSchema.partial();

export type CreateClinicInput = z.infer<typeof createClinicSchema>;
export type UpdateClinicInput = z.infer<typeof updateClinicSchema>;

// ============================================================================
// SCHEDULE SCHEMAS
// ============================================================================

export const createScheduleSchema = z.object({
  clinicId: z.string().cuid(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
  slotMinutes: z.number().int().min(15).default(30),
  maxPerSlot: z.number().int().min(1).default(1),
});

export const updateScheduleSchema = createScheduleSchema.partial();

export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;

// ============================================================================
// BLOCKED DATE SCHEMAS
// ============================================================================

export const createBlockedDateSchema = z.object({
  date: z.string().datetime(),
  reason: z.string().optional(),
});

export type CreateBlockedDateInput = z.infer<typeof createBlockedDateSchema>;

// ============================================================================
// APPOINTMENT SCHEMAS
// ============================================================================

export const createAppointmentSchema = z.object({
  doctorId: z.string().cuid(),
  clinicId: z.string().cuid(),
  dateTime: z.string().datetime(),
  patientNotes: z.string().optional(),
});

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(['PENDING', 'PAYMENT_UPLOADED', 'PAYMENT_VERIFIED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
  cancelReason: z.string().optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentStatusInput = z.infer<typeof updateAppointmentStatusSchema>;

// ============================================================================
// PAYMENT SCHEMAS
// ============================================================================

export const createPaymentSchema = z.object({
  appointmentId: z.string().cuid(),
  screenshotUrl: z.string().url(),
  amount: z.number().positive(),
});

export const verifyPaymentSchema = z.object({
  status: z.enum(['VERIFIED', 'REJECTED']),
  rejectionReason: z.string().optional(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;

// ============================================================================
// PRESCRIPTION SCHEMAS
// ============================================================================

export const createPrescriptionSchema = z.object({
  appointmentId: z.string().cuid(),
  medicines: z.array(z.object({
    name: z.string(),
    dosage: z.string(),
    frequency: z.string(),
    duration: z.string(),
    instructions: z.string().optional(),
  })),
  instructions: z.string().optional(),
  followUpDate: z.string().datetime().optional(),
});

export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;

// ============================================================================
// MEDICAL HISTORY SCHEMAS
// ============================================================================

export const createMedicalHistorySchema = z.object({
  appointmentId: z.string().cuid().optional(),
  diagnosis: z.string().min(5, 'Diagnosis required'),
  doctorNotes: z.string().optional(),
});

export type CreateMedicalHistoryInput = z.infer<typeof createMedicalHistorySchema>;

// ============================================================================
// ADMIN SCHEMAS
// ============================================================================

export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});

export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
