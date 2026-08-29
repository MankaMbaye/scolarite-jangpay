export interface AuthResponse {
  token: string;
  userId: string;
  tenantId: string | null;
  role: string;
  fullName: string;
  email: string;
}

export interface LoginRequest {
  tenantCode: string;
  email: string;
  password: string;
}

export interface RegisterTenantRequest {
  tenantName: string;
  tenantCode: string;
  adminFullName: string;
  adminEmail: string;
  adminPassword: string;
}
