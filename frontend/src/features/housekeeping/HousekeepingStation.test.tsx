import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authApi } from "../../shared/api/auth";
import { housekeepingTechnicalApi } from "../../shared/api/housekeepingTechnical";
import HousekeepingStation from "./HousekeepingStation";
import { apiClient } from "../../shared/api/client";
import { ServicesPanel } from "./ServicesPanel";

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

  it("labels ready rooms as vacant and hides unsupported checklist and minibar controls", async () => {
    render(<HousekeepingStation onBack={onBack} />);
    await screen.findByText("P.201", { exact: true });
    expect(screen.getAllByText("Phòng trống").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Checklist:|Đang thực hiện checklist/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Bảng trạng thái phòng" }));
    fireEvent.click(await screen.findByText("201", { exact: true }));
    expect(screen.getByText("Phòng trống, đã sẵn sàng đón khách.")).toBeTruthy();
    expect(screen.queryByText(/Kiểm kê minibar|Checklist đồ vải|Minibar:/)).toBeNull();
    expect(screen.queryByRole("button", {name:"Hoàn tất vệ sinh & Bàn giao"})).toBeNull();
  });

  it("shows occupied room numbers on the overview without cleaning actions", async () => {
    render(<HousekeepingStation onBack={onBack} />);
    const section = await screen.findByRole("region", { name: "Phòng đang có khách" });
    expect(await within(section).findByText("Phòng 202")).toBeTruthy();
    expect(within(section).getByText("Tầng 2 · Standard")).toBeTruthy();
    expect(within(section).queryByRole("button")).toBeNull();
    fireEvent.change(screen.getByPlaceholderText("Tìm phòng, ghi chú..."), { target: { value: "101" } });
    expect(within(section).queryByText("Phòng 202")).toBeNull();
  });

  it("renders a real empty state when the room API returns no rooms", async () => {
    vi.mocked(housekeepingTechnicalApi.rooms).mockResolvedValue([]);
    render(<HousekeepingStation onBack={onBack} />);
    fireEvent.click(await screen.findByRole("button", { name: "Bảng trạng thái phòng" }));
    expect(screen.queryByText("101", { exact: true })).toBeNull();
    expect(screen.getAllByText("Không có phòng").length).toBeGreaterThan(0);
  });
});


describe("Housekeeping service summaries",()=>{
 afterEach(()=>{cleanup();vi.restoreAllMocks();});
 it("shows one stay summary and read-only details including cancelled rows",async()=>{
  const request=vi.spyOn(apiClient,"request").mockImplementation(async(path)=>{
   if(path==="/api/services")return [] as any;
   if(path==="/api/service-usages/summary")return [{reservation_id:7,room_ids:["HK904"],guest_name:"Khách An",service_count:2,total_quantity:5,total_amount:540000,usages:[
    {id:1,service_name:"Giặt ủi",quantity:2,unit_price:90000,amount:180000,used_at:"2026-10-21T10:00:00",cancelled:false},
    {id:2,service_name:"Ăn sáng",quantity:3,unit_price:120000,amount:360000,used_at:"2026-10-21T10:00:00",cancelled:false},
    {id:3,service_name:"Giặt đã hủy",quantity:1,unit_price:90000,amount:90000,used_at:"2026-10-21T10:00:00",cancelled:true},
   ]}] as any;
   throw new Error(`Unexpected request ${path}`);
  });
  render(<ServicesPanel/>);
  expect(await screen.findByText("Khách An")).toBeTruthy();
  expect(screen.getByText("HK904")).toBeTruthy();
  expect(screen.queryByRole("button",{name:"Ghi sử dụng"})).toBeNull();
  expect(screen.queryByRole("button",{name:"Hủy sử dụng"})).toBeNull();
  fireEvent.click(screen.getByRole("button",{name:"Xem chi tiết phiếu #7"}));
  const details=screen.getByRole("region",{name:"Chi tiết dịch vụ"});
  expect(within(details).getByText("Giặt đã hủy")).toBeTruthy();
  expect(within(details).getByText("Đã hủy — không tính tiền")).toBeTruthy();
  expect(within(details).getAllByText("Đã ghi nhận")).toHaveLength(2);
  expect(within(details).queryByRole("button",{name:/Hủy/})).toBeNull();
  expect(request.mock.calls.every(([,options])=>!options?.method||options.method==="GET")).toBe(true);
 });
 it("handles an empty summary",async()=>{
  vi.spyOn(apiClient,"request").mockResolvedValue([]);
  render(<ServicesPanel/>);
  expect(await screen.findByText("Chưa có phòng sử dụng dịch vụ.")).toBeTruthy();
 });
});
