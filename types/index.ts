export type Role = 'PATIENT' | 'DOCTOR' | 'ASSISTANT' | 'ADMIN' | 'SUPER_ADMIN';

export interface JWTPayload {
  userId: string;
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
