import { describe, expect, it } from "vitest";
import { resolveEmployeeDestination, staffAccounts } from "./staffAccounts";

describe("staff account navigation", () => {
  it("keeps the four supported employee ID and email aliases mapped to the same station", () => {
    expect(staffAccounts.frontdesk).toMatchObject({ employeeId: "FRONTDESK", view: "frontdesk" });
    expect(staffAccounts["frontdesk@hotel.com"]).toMatchObject({ employeeId: "FRONTDESK", view: "frontdesk" });
    expect(staffAccounts.housekeep).toMatchObject({ employeeId: "HOUSEKEEP", view: "housekeeping" });
    expect(staffAccounts.accounting).toMatchObject({ employeeId: "ACCOUNTING", view: "accounting" });
    expect(staffAccounts.manager).toMatchObject({ employeeId: "MANAGER", view: "manager" });
    expect(staffAccounts.technical).toBeUndefined();
    expect(staffAccounts.admin).toBeUndefined();
  });

  it("routes only by the authenticated backend role and rejects unsupported roles", () => {
    expect(resolveEmployeeDestination("MANAGER")).toEqual({ role: "manager", view: "manager" });
    expect(() => resolveEmployeeDestination("STAFF")).toThrow("Không xác định được vai trò nhân viên");
    expect(() => resolveEmployeeDestination("DIRECTOR")).toThrow("Không xác định được vai trò nhân viên");
    expect(() => resolveEmployeeDestination("UNKNOWN")).toThrow("Không xác định được vai trò nhân viên");
  });
});
