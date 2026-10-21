import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../../shared/api/client";
import { ManagerCatalogs } from "./ManagerCatalogs";

let originalScrollIntoView: PropertyDescriptor | undefined;

describe("ManagerCatalogs employee deletion", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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
