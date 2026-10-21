import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../../shared/api/client";
import { authApi } from "../../shared/api/auth";
import { financeApi } from "../../shared/api/finance";
import { frontDeskApi } from "../../shared/api/frontDesk";
import { housekeepingTechnicalApi } from "../../shared/api/housekeepingTechnical";
import ManagerDashboard from "./ManagerDashboard";
import { ManagerCatalogs } from "./ManagerCatalogs";

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

  it("opens the employee catalog when a manager selects an employee search result", async () => {
    vi.mocked(apiClient.request).mockImplementation(async path => {
      if(path === "/api/auth/employees")return [{employee_id:"EMP_1",full_name:"Nhân viên thử",role:"FRONT_DESK",phone:"0902000001"}] as never;
      if(path.startsWith("/api/governance/audit"))return {items:[]} as never;
      return [] as never;
    });
    render(<ManagerDashboard role="manager" onBack={onBack} />);
    await screen.findAllByText("Trần Quản Lý Vận Hành");
    fireEvent.change(screen.getByPlaceholderText("Tìm phòng hoặc nhân viên..."),{target:{value:"EMP_1"}});
    fireEvent.click(await screen.findByRole("button",{name:"Nhân viên thử"}));
    await screen.findByRole("row",{name:/EMP_1/});
    expect(screen.getByRole("button",{name:"Nhân viên"}).getAttribute("aria-pressed")).toBe("true");
    expect((screen.getByPlaceholderText("Tìm phòng hoặc nhân viên...") as HTMLInputElement).value).toBe("");
  });
});


/* Danh mục nhân viên và điều hướng kết quả tìm kiếm. */
let originalScrollIntoView: PropertyDescriptor | undefined;

describe("ManagerCatalogs employee deletion", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    originalScrollIntoView = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollIntoView");
    vi.spyOn(apiClient, "request").mockImplementation(async (path, options) => {
      if (path === "/api/auth/employees" && options?.method !== "DELETE") {
        return [{ employee_id: "EMP_1", full_name: "Nhân viên thử", phone: "0902000001", role: "FRONT_DESK" }] as never;
      }
      if (path === "/api/room-types" || path === "/api/rooms/admin") return [] as never;
      if (path.startsWith("/api/governance/audit")) return { items: [] } as never;
      return undefined as never;
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    cleanup();
    if (originalScrollIntoView) {
      Object.defineProperty(HTMLElement.prototype, "scrollIntoView", originalScrollIntoView);
      originalScrollIntoView = undefined;
    } else {
      Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
    }
  });

  it("confirms and deactivates an employee while refreshing the catalog", async () => {
    const onChanged = vi.fn();
    render(<ManagerCatalogs currentEmployeeId="MANAGER" onChanged={onChanged} />);

    fireEvent.click(await screen.findByRole("button", { name: "Xóa nhân viên EMP_1" }));

    expect(window.confirm).toHaveBeenCalledWith(
      "Xóa nhân viên EMP_1 khỏi danh sách hoạt động? Lịch sử đặt phòng và nhật ký nghiệp vụ sẽ được giữ lại.",
    );
    await waitFor(() => {
      expect(apiClient.request).toHaveBeenCalledWith("/api/auth/employees/EMP_1", { method: "DELETE" });
      expect(onChanged).toHaveBeenCalled();
    });
    expect((await screen.findByRole("status")).textContent).toContain("Đã xóa nhân viên khỏi danh sách hoạt động.");
  });

  it("does not send a delete request when deletion is cancelled", async () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    render(<ManagerCatalogs currentEmployeeId="MANAGER" onChanged={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: "Xóa nhân viên EMP_1" }));

    expect(apiClient.request).not.toHaveBeenCalledWith("/api/auth/employees/EMP_1", { method: "DELETE" });
  });

  it("does not offer deletion for the signed-in manager", async () => {
    vi.spyOn(apiClient, "request").mockImplementation(async (path, options) => {
      if (path === "/api/auth/employees" && options?.method !== "DELETE") {
        return [{ employee_id: "MANAGER", full_name: "Quản lý", phone: "0902000006", role: "MANAGER" }] as never;
      }
      if (path === "/api/room-types" || path === "/api/rooms/admin") return [] as never;
      if (path.startsWith("/api/governance/audit")) return { items: [] } as never;
      return undefined as never;
    });
    render(<ManagerCatalogs currentEmployeeId="MANAGER" onChanged={vi.fn()} />);

    expect(await screen.findByText("Quản lý")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Xóa nhân viên MANAGER" })).toBeNull();
  });

  it("waits for the signed-in employee identity before offering deactivation", async () => {
    const view=render(<ManagerCatalogs currentEmployeeId="" onChanged={vi.fn()} />);
    await screen.findByRole("row",{name:/EMP_1/});
    expect(screen.queryByRole("button",{name:"Xóa nhân viên EMP_1"})).toBeNull();
    view.rerender(<ManagerCatalogs currentEmployeeId="MANAGER" onChanged={vi.fn()} />);
    expect(await screen.findByRole("button",{name:"Xóa nhân viên EMP_1"})).toBeTruthy();
  });

  it("opens the employee catalog and scrolls to the selected employee", async () => {
    const scrollIntoView = vi.fn();
    originalScrollIntoView = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollIntoView");
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: scrollIntoView });
    render(<ManagerCatalogs currentEmployeeId="MANAGER" onChanged={vi.fn()} focusTarget={{ type: "employee", id: "EMP_1", nonce: 1 }} />);

    await screen.findByRole("row", { name: /EMP_1/ });
    expect(screen.getByRole("button", { name: "Nhân viên" }).getAttribute("aria-pressed")).toBe("true");
    await waitFor(() => {
      const row = screen.getByRole("row", { name: /EMP_1/ });
      expect(row.getAttribute("data-catalog-target")).toBe("employee:EMP_1");
      expect(row.className).toContain("manager-catalog-highlight");
    });
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });
  });

  it("opens the room catalog and highlights the selected room", async () => {
    const scrollIntoView = vi.fn();
    originalScrollIntoView = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollIntoView");
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: scrollIntoView });
    vi.mocked(apiClient.request).mockImplementation(async (path, options) => {
      if (path === "/api/auth/employees" && options?.method !== "DELETE") {
        return [{ employee_id: "EMP_1", full_name: "Nhân viên thử", phone: "0902000001", role: "FRONT_DESK" }] as never;
      }
      if (path === "/api/rooms/admin") {
        return [{ id: "204", room_type_id: "DLX", floor: 2, description: "" }] as never;
      }
      if (path === "/api/room-types") return [] as never;
      if (path.startsWith("/api/governance/audit")) return { items: [] } as never;
      return undefined as never;
    });
    render(<ManagerCatalogs currentEmployeeId="MANAGER" onChanged={vi.fn()} focusTarget={{ type: "room", id: "204", nonce: 2 }} />);

    await screen.findByText("Phòng 204 · DLX · Tầng 2");
    expect(screen.getByRole("button", { name: "Phòng" }).getAttribute("aria-pressed")).toBe("true");
    await waitFor(() => {
      const room = screen.getByText("Phòng 204 · DLX · Tầng 2");
      expect(room.parentElement?.getAttribute("data-catalog-target")).toBe("room:204");
      expect(room.parentElement?.className).toContain("manager-catalog-highlight");
    });
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });
  });
});
