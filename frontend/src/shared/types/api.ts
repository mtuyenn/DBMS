/** Exact employee roles exposed by the backend EmployeeRole enum. */
export const EMPLOYEE_ROLES = ["MANAGER", "FRONT_DESK", "HOUSEKEEPING", "ACCOUNTING"] as const;
export type EmployeeRole = typeof EMPLOYEE_ROLES[number];
export const EMPLOYEE_ROLE_LABELS: Record<EmployeeRole, string> = {
  MANAGER: "Quản lý",
  FRONT_DESK: "Lễ tân",
  HOUSEKEEPING: "Buồng phòng",
  ACCOUNTING: "Kế toán",
};
export function employeeRoleLabel(role: string | null | undefined): string {
  if (!role) return "";
  return EMPLOYEE_ROLE_LABELS[role as EmployeeRole] ?? role;
}

export type AuthIdentity = "customer" | "employee";
/** Exact permission authorities exposed by the backend Permission enum. */
export const PERMISSION_CODES = ["EMPLOYEE_READ", "EMPLOYEE_PROVISION", "EMPLOYEE_PASSWORD_RESET", "ROOM_READ", "ROOM_WRITE", "ROOM_ADMIN_READ", "ROOM_ADMIN_WRITE", "ROOM_CATALOG_WRITE", "GUEST_READ", "GUEST_WRITE", "RESERVATION_READ", "RESERVATION_CREATE", "RESERVATION_WRITE", "RESERVATION_CHECKOUT", "RESERVATION_SERVICE_WRITE", "FRONT_DESK_DASHBOARD", "BILLING_READ", "PAYMENT_COLLECT", "PAYMENT_WRITE", "RECEIPT_WRITE", "SERVICE_READ", "SERVICE_WRITE", "FINANCE_READ", "AUDIT_READ"] as const;
export type PermissionCode = typeof PERMISSION_CODES[number];
export interface EmployeeLoginRequest { employee_id: string; password: string; }
export interface CustomerLoginRequest { phone: string; password: string; }
export interface TokenResponseDto { access_token: string; refresh_token: string; token_type: string; expires_in: number; refresh_expires_in: number; }
export interface RefreshRequestDto { refresh_token: string; }
export interface LogoutRequestDto { refresh_token?: string; }

export interface EmployeeProfileDto { employee_id: string; full_name: string; role: EmployeeRole; permissions: PermissionCode[]; }
export interface CustomerAccountDto { id: number; guest_id: number; phone: string; enabled: boolean; account_non_locked: boolean; }
export interface CustomerGuestDto {
  id: number; full_name: string; identity_number: string; phone: string; email?: string; total_spend: number;
}
export interface CustomerProfileDto { account: CustomerAccountDto; guest: CustomerGuestDto; }
export interface SessionDto {
  identity: AuthIdentity;
  customer?: CustomerProfileDto;
  employee?: EmployeeProfileDto;
  employee_profile_status?: "verified" | "blocked";
  employee_profile_error?: string;
}
export interface ApiErrorDto {
  timestamp?: string;
  status?: number;
  code?: string;
  message?: string;
  details?: string[];
}
