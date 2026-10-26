import type { RoleId } from "../../shared/types/domain";

export type View =
  | "login"
  | "customer"
  | "frontdesk"
  | "housekeeping"
  | "accounting"
  | "manager"

export interface StaffAccount {
  employeeId: string;
  role: RoleId;
  view: View;
  label: string;
}

export const staffAccounts: Record<string, StaffAccount> = {
  // Employee IDs accepted by the login form.
  frontdesk: { employeeId: "FRONTDESK", role: "reception", view: "frontdesk", label: "Lễ tân" },
  frontdesk2: { employeeId: "FRONTDESK2", role: "reception", view: "frontdesk", label: "Lễ tân 2" },
  housekeep: { employeeId: "HOUSEKEEP", role: "housekeeping", view: "housekeeping", label: "Buồng phòng" },
  accounting: { employeeId: "ACCOUNTING", role: "accounting", view: "accounting", label: "Kế toán" },
  manager: { employeeId: "MANAGER", role: "manager", view: "manager", label: "Quản lý" },
  // Email aliases retained for existing login credentials.
  "frontdesk@hotel.com": { employeeId: "FRONTDESK", role: "reception", view: "frontdesk", label: "Lễ tân" },
  "housekeeping@hotel.com": { employeeId: "HOUSEKEEP", role: "housekeeping", view: "housekeeping", label: "Buồng phòng" },
  "accounting@hotel.com": { employeeId: "ACCOUNTING", role: "accounting", view: "accounting", label: "Kế toán" },
  "manager@hotel.com": { employeeId: "MANAGER", role: "manager", view: "manager", label: "Quản lý" },
};

const employeeRoleDestinations: Record<string, Pick<StaffAccount, "role" | "view">> = {
  FRONT_DESK: { role: "reception", view: "frontdesk" },
  HOUSEKEEPING: { role: "housekeeping", view: "housekeeping" },
  ACCOUNTING: { role: "accounting", view: "accounting" },
  MANAGER: { role: "manager", view: "manager" },
};

export function resolveEmployeeDestination(role: string): Pick<StaffAccount, "role" | "view"> {
  if (employeeRoleDestinations[role]) return employeeRoleDestinations[role];
  throw new Error("Không xác định được vai trò nhân viên từ hồ sơ máy chủ.");
}
