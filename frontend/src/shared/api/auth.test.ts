import { afterEach,describe,expect,it,vi } from "vitest";
import { apiClient } from "./client";
import { authApi } from "./auth";
afterEach(()=>vi.restoreAllMocks());
describe("Employee authentication",()=>{
 it("signs in and reads the employee profile",async()=>{
  const request=vi.spyOn(apiClient,"request").mockResolvedValue({});
  await authApi.employeeLogin({employee_id:"FRONTDESK",password:"hotel123"});
  await authApi.employeeProfile();
  expect(request).toHaveBeenNthCalledWith(1,"/api/auth/login",{method:"POST",body:{employee_id:"FRONTDESK",password:"hotel123"},skipAuth:true});
  expect(request).toHaveBeenNthCalledWith(2,"/api/auth/me");
 });
});
