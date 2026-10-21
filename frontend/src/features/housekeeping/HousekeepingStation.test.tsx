import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authApi } from "../../shared/api/auth";
import { housekeepingTechnicalApi } from "../../shared/api/housekeepingTechnical";
import HousekeepingStation from "./HousekeepingStation";

describe("HousekeepingStation with the existing room status board", () => {
  const onBack = vi.fn();
  const profile = {
    employee_id: "EMP01",
    full_name: "Nguyễn Thị Lan",
    role: "HOUSEKEEPING",
    permissions: ["ROOM_READ", "ROOM_WRITE"],
  };
  let backendRooms: {
    id: string;
    name: string;
    room_type_id: string;
    room_type_name: string;
    daily_price: number;
    floor: number;
    status: "available" | "cleaning" | "occupied";
    workflow_status: string;
  }[];

  beforeEach(() => {
    vi.restoreAllMocks();
    backendRooms = [
      { id: "101", name: "101", room_type_id: "STD", room_type_name: "Standard", daily_price: 500000, floor: 1, status: "cleaning", workflow_status: "Cần dọn" },
      { id: "102", name: "102", room_type_id: "STD", room_type_name: "Standard", daily_price: 500000, floor: 1, status: "cleaning", workflow_status: "Đang dọn" },
      { id: "201", name: "201", room_type_id: "DLX", room_type_name: "Deluxe", daily_price: 700000, floor: 2, status: "available", workflow_status: "Sẵn sàng" },
      { id: "202", name: "202", room_type_id: "STD", room_type_name: "Standard", daily_price: 500000, floor: 2, status: "occupied", workflow_status: "Đang có khách" },
    ];
    vi.spyOn(authApi, "employeeProfile").mockResolvedValue(profile as any);
    vi.spyOn(housekeepingTechnicalApi, "rooms").mockImplementation(async () => backendRooms as any);
    vi.spyOn(housekeepingTechnicalApi, "updateRoomStatus").mockImplementation(async (roomId, status) => {
      backendRooms = backendRooms.map(room => room.id === roomId
        ? { ...room, status: status === "available" ? "available" : "cleaning", workflow_status: status === "available" ? "Sẵn sàng" : "Đang dọn" }
        : room);
      return backendRooms.find(room => room.id === roomId) as any;
    });
  });

  afterEach(cleanup);

  it("keeps the existing MaM housekeeping layout and shows only supported room tabs", async () => {
    render(<HousekeepingStation onBack={onBack} />);
    expect(await screen.findByText("MaM Hotel")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Tổng quan" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Bảng trạng thái phòng" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Đồ vải|Minibar|Báo sự cố|Checklist/ })).toBeNull();
  });

  it("starts and completes room cleaning using the existing room status endpoint", async () => {
    render(<HousekeepingStation onBack={onBack} />);
    fireEvent.click(await screen.findByRole("button", { name: "Bảng trạng thái phòng" }));
    fireEvent.click(await screen.findByText("101", { exact: true }));
    fireEvent.click(screen.getByRole("button", { name: "Bắt đầu dọn phòng" }));
    await waitFor(() => expect(housekeepingTechnicalApi.updateRoomStatus).toHaveBeenCalledWith("101", "cleaning"));

    fireEvent.click(await screen.findByText("101", { exact: true }));
    fireEvent.click(screen.getByRole("button", { name: "Hoàn tất vệ sinh & Bàn giao" }));
    await waitFor(() => expect(housekeepingTechnicalApi.updateRoomStatus).toHaveBeenCalledWith("101", "available"));
    await waitFor(() => expect(backendRooms.find(room => room.id === "101")?.workflow_status).toBe("Sẵn sàng"));
    expect(screen.getAllByText("Sẵn sàng").length).toBeGreaterThan(0);
  });

  it("does not show occupied rooms as rooms needing housekeeping", async () => {
    render(<HousekeepingStation onBack={onBack} />);
    fireEvent.click(await screen.findByRole("button", { name: "Bảng trạng thái phòng" }));
    expect(screen.getByText("101", { exact: true })).toBeTruthy();
    expect(screen.queryByText("202", { exact: true })).toBeNull();
  });

  it("renders a real empty state when the room API returns no rooms", async () => {
    vi.mocked(housekeepingTechnicalApi.rooms).mockResolvedValue([]);
    render(<HousekeepingStation onBack={onBack} />);
    fireEvent.click(await screen.findByRole("button", { name: "Bảng trạng thái phòng" }));
    expect(screen.queryByText("101", { exact: true })).toBeNull();
    expect(screen.getAllByText("Không có phòng").length).toBeGreaterThan(0);
  });
});
