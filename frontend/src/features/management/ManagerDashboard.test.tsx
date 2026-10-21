import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../../shared/api/client";
import { authApi } from "../../shared/api/auth";
import { financeApi } from "../../shared/api/finance";
import { frontDeskApi } from "../../shared/api/frontDesk";
import { housekeepingTechnicalApi } from "../../shared/api/housekeepingTechnical";
import ManagerDashboard from "./ManagerDashboard";

describe("ManagerDashboard supported overview", () => {
  const onBack = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(authApi, "employeeProfile").mockResolvedValue({
      employee_id: "EMP_MGR",
      full_name: "Trần Quản Lý Vận Hành",
      role: "MANAGER",
      permissions: ["EMPLOYEE_READ", "FINANCE_READ"],
    });
    vi.spyOn(apiClient, "request").mockResolvedValue([] as never);
    vi.spyOn(housekeepingTechnicalApi, "rooms").mockResolvedValue([
      { id: "101", name: "101", room_type_id: "STD", room_type_name: "Standard", daily_price: 500000, floor: 1, status: "available", workflow_status: "Sẵn sàng" },
      { id: "201", name: "201", room_type_id: "DLX", room_type_name: "Deluxe", daily_price: 700000, floor: 2, status: "cleaning", workflow_status: "Cần dọn" },
    ] as any);
    vi.spyOn(frontDeskApi, "invoices").mockResolvedValue({
      items: [], page: 0, size: 100, total_elements: 0, total_pages: 0,
    });
    vi.spyOn(financeApi, "payments").mockResolvedValue({
      items: [], page: 0, size: 100, totalElements: 0, totalPages: 0, methodCounts: {},
    });
  });

  afterEach(cleanup);

  it("keeps the existing MaM overview and loads real rooms and the employee roster", async () => {
    render(<ManagerDashboard role="manager" onBack={onBack} />);
    expect(await screen.findByRole("heading", { name: "Tổng quan điều hành" })).toBeTruthy();
    expect(screen.getAllByText("Trần Quản Lý Vận Hành").length).toBeGreaterThan(0);
    expect(apiClient.request).toHaveBeenCalledWith("/api/rooms");
    expect(frontDeskApi.invoices).toHaveBeenCalled();
    expect(apiClient.request).toHaveBeenCalledWith("/api/auth/employees");
    expect(screen.queryByRole("button", { name: /Trung tâm Phê duyệt|Nhân sự & Phân ca|Sự cố & Khẩn cấp/ })).toBeNull();
  });

  it("opens the existing reports screen from the manager navigation", async () => {
    render(<ManagerDashboard role="manager" onBack={onBack} />);
    fireEvent.click(await screen.findByRole("button", { name: "Báo cáo điều hành" }));
    expect(await screen.findByRole("heading", { name: "Báo cáo điều hành" })).toBeTruthy();
    expect(screen.getAllByText(/Tiền đã thu trong tháng/).length).toBeGreaterThan(0);
  });
});
