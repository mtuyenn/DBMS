import { apiClient } from "./client";
import type { EmployeeLoginRequest, EmployeeProfileDto, TokenResponseDto } from "../types/api";

export const authApi = {
  employeeLogin: (body: EmployeeLoginRequest) => apiClient.request<TokenResponseDto>("/api/auth/login", { method: "POST", body, skipAuth: true }),
  employeeProfile: () => apiClient.request<EmployeeProfileDto>("/api/auth/me"),
  changePassword: (password: string) => apiClient.request<void>("/api/auth/me/password", { method: "POST", body: { password } }),
  logout: () => apiClient.logout(),
};
