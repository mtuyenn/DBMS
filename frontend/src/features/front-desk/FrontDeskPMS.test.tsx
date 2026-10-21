import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FrontDeskPMS from "./FrontDeskPMS";
import { authApi } from "../../shared/api/auth";
import { frontDeskApi } from "../../shared/api/frontDesk";
import { ApiError } from "../../shared/api/client";

describe("FrontDeskPMS Reception Interface", () => {
  const onBack = vi.fn();

  afterEach(cleanup);

  it("counts ready rooms from the operational state instead of cleanliness badges", async () => {
    vi.mocked(frontDeskApi.dashboard).mockResolvedValue({
      business_date: "2026-10-15", page: 0, size: 10, total_elements: 0, total_pages: 0,
      current_stays: [], arrivals: [], departures: [], invoice_balances: [], incidents: [], room_counts: {},
      rooms: ["available", "occupied", "reserved", "cleaning", "maintenance", "out_of_service"].map((status, i) => ({
        room_id: String(101 + i), name: String(101 + i), floor: 1, room_type_id: "CLASSIC",
        room_type_name: "Classic", daily_price: 1000000, bed_type: "Queen", status,
      })),
    });
    render(<FrontDeskPMS onBack={onBack} />);
    expect(await screen.findByText("Sẵn sàng: 1", { exact: true })).toBeTruthy();
    expect(screen.getByText("Đã giữ: 1 · Đang dọn: 1", { exact: true })).toBeTruthy();
  });

  it("creates a booking with the authenticated employee, not the old demo actor", async () => {
    vi.mocked(authApi.employeeProfile).mockResolvedValue({ employee_id: "FRONTDESK", full_name: "Lễ tân thật", role: "FRONT_DESK", permissions: [] });
    vi.spyOn(frontDeskApi, "guests").mockResolvedValue([{ id: 10, full_name: "Khách demo", identity_number: "123456789", phone: "0912345678", email: null, total_spend: 0 }]);
    const create = vi.spyOn(frontDeskApi, "createReservation").mockResolvedValue({ id: 77 } as any);
    render(<FrontDeskPMS onBack={onBack} />);
    await screen.findAllByText("Lễ tân thật");
    fireEvent.click(screen.getByRole("button", {name: /Khách hàng/i}));
    fireEvent.click(screen.getByRole("button", {name: /Tạo đặt phòng/i}));
    fireEvent.change(screen.getByLabelText("Khách hàng *"), {target: {value: "Khách demo"}});
    fireEvent.click(await screen.findByRole("button", {name: /Khách demo/}));
    fireEvent.change(screen.getByLabelText(/Mã số phòng/), {target: {value: "802"}});
    fireEvent.change(screen.getByLabelText(/Thời gian nhận phòng/), {target: {value: "2035-01-10T14:00"}});
    fireEvent.change(screen.getByLabelText(/Thời gian trả phòng/), {target: {value: "2035-01-12T12:00"}});
    fireEvent.click(screen.getByRole("button", {name: "Tạo lượt lưu trú"}));
    await waitFor(() => expect(create).toHaveBeenCalledWith(expect.objectContaining({employee_id: "FRONTDESK", guest_id: 10, rental_type: "PACKAGE"})));
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(authApi, "employeeProfile").mockResolvedValue({
      employee_id: "EMP001",
      full_name: "Nguyễn Văn Lễ Tân",
      role: "FRONT_DESK",
      permissions: ["FRONT_DESK_DASHBOARD", "RESERVATION_READ", "RESERVATION_WRITE"],
    });

    vi.spyOn(frontDeskApi, "dashboard").mockResolvedValue({
      business_date: "2026-09-20",
      page: 1,
      size: 10,
      total_elements: 3,
      total_pages: 1,
      room_counts: {},
      invoice_balances: [],
      rooms: [
        { room_id: "101", name: "101", floor: 1, room_type_id: "DELUXE", room_type_name: "Deluxe King", bed_type: "1 Giường King", daily_price: 850000, status: "OCCUPIED" },
        { room_id: "102", name: "102", floor: 1, room_type_id: "STANDARD", room_type_name: "Standard Twin", bed_type: "2 Giường đơn", daily_price: 550000, status: "VACANT" },
        { room_id: "203", name: "203", floor: 2, room_type_id: "VIP", room_type_name: "Executive Suite", bed_type: "1 Giường Super King", daily_price: 1500000, status: "OCCUPIED" },
        { room_id: "104", name: "104", floor: 1, room_type_id: "STANDARD", room_type_name: "Standard Double", bed_type: "1 Giường đôi", daily_price: 650000, status: "READY" },
        { room_id: "105", name: "105", floor: 1, room_type_id: "STANDARD", room_type_name: "Standard Double", bed_type: "1 Giường đôi", daily_price: 650000, status: "READY" },
      ],
      current_stays: [
        { reservation_id: 1001, guest_id: 10, guest_name: "Trần Văn An", guest_phone: "0901234567", check_in: "2026-09-20T14:00:00", check_out: "2026-09-22T12:00:00", status: "CHECKED_IN", invoice_balance: 1200000, room_ids: ["203"] },
      ],
      arrivals: [
        { reservation_id: 1002, guest_id: 11, guest_name: "Lê Thị Bình", guest_phone: "0912345678", check_in: "2026-09-20T14:00:00", check_out: "2026-09-21T12:00:00", status: "CONFIRMED", invoice_balance: 250000, room_ids: ["102"] },
      ],
      departures: [
        { reservation_id: 1003, guest_id: 12, guest_name: "Hoàng Minh Cường", guest_phone: "0923456789", check_in: "2026-09-18T14:00:00", check_out: "2026-09-20T12:00:00", status: "CHECKED_IN", invoice_balance: 0, room_ids: ["101"] },
      ],
      incidents: [
        { id: 1, reservation_id: 1001, room_id: "101", compensation: 0 },
      ],
    });

    vi.spyOn(frontDeskApi, "reservations").mockResolvedValue({ items: [], page: 0, size: 100, total_elements: 0, total_pages: 0 });
    vi.spyOn(frontDeskApi, "guests").mockResolvedValue([]);

    vi.spyOn(frontDeskApi, "services").mockResolvedValue([
      { id: "1", name: "Coca Cola", price: 30000, unit: "lon", stock: 10, active: true },
      { id: "2", name: "Giặt ủi áo sơ mi", price: 50000, unit: "cái", stock: 10, active: true },
    ]);

    vi.spyOn(frontDeskApi, "timeline").mockResolvedValue([]);
    vi.spyOn(frontDeskApi, "payments").mockResolvedValue([]);
    vi.spyOn(frontDeskApi, "receipts").mockResolvedValue([]);

    vi.spyOn(frontDeskApi, "reservation").mockResolvedValue({
      id: 1001,
      guest_id: 10,
      employee_id: "EMP001",
      status: "CHECKED_IN",
      booked_at: "2026-09-18T10:00:00",
      actual_check_in: "2026-09-20T14:00:00",
      actual_check_out: null,
      cancellation_reason: null,
      rental_type: "PACKAGE",
      rooms: [{ room_id: "203", expected_check_in: "2026-09-20T14:00:00", expected_check_out: "2026-09-22T12:00:00", actual_check_in: "2026-09-20T14:00:00", actual_check_out: null }],
    });

    vi.spyOn(frontDeskApi, "invoice").mockResolvedValue({
      id: 2001,
      reservation_id: 1001,
      issued_at: "2026-09-20T14:00:00",
      payable: 1200000,
      room_total: 1500000,
      service_total: 200000,
      late_surcharge: 0,
      compensation: 0,
      extension_total: 0,
      adjustment_total: 0,
      discount: 0,
      payment_method: null,
      status: "CHUA_THANH_TOAN",
    });

    vi.spyOn(frontDeskApi, "checkIn").mockResolvedValue({
      id: 1002,
      guest_id: 11,
      employee_id: "EMP001",
      status: "CHECKED_IN",
      booked_at: "2026-09-18T10:00:00",
      actual_check_in: "2026-09-20T14:05:00",
      actual_check_out: null,
      cancellation_reason: null,
      rental_type: "PACKAGE",
      rooms: [{ room_id: "102", expected_check_in: "2026-09-20T14:00:00", expected_check_out: "2026-09-21T12:00:00", actual_check_in: "2026-09-20T14:05:00", actual_check_out: null }],
    });

    vi.spyOn(frontDeskApi, "checkOut").mockResolvedValue({
      id: 2001,
      reservation_id: 1001,
      issued_at: "2026-09-20T14:00:00",
      payable: 1200000,
      room_total: 1500000,
      service_total: 200000,
      late_surcharge: 0,
      compensation: 0,
      extension_total: 0,
      adjustment_total: 0,
      discount: 0,
      payment_method: null,
      status: "DA_THANH_TOAN",
    });

  });

  it("rejects garbage phone numbers and shows the reason inside the guest form", async () => {
    const create = vi.spyOn(frontDeskApi, "createGuest");
    render(<FrontDeskPMS onBack={onBack} />);
    await screen.findAllByText("Nguyễn Văn Lễ Tân");
    fireEvent.click(screen.getByRole("button", {name: /Khách hàng/i}));
    fireEvent.click(screen.getByRole("button", {name: "Thêm khách hàng"}));
    fireEvent.change(screen.getByLabelText("Họ và tên *"), {target: {value: "Khách demo"}});
    fireEvent.change(screen.getByLabelText("CCCD / Hộ chiếu *"), {target: {value: "TEST123"}});
    fireEvent.change(screen.getByLabelText("Số điện thoại *"), {target: {value: "abc"}});
    fireEvent.click(screen.getByRole("button", {name: "Tạo hồ sơ"}));
    expect(within(screen.getByRole("form", {name: "Tạo hồ sơ khách hàng"})).getByRole("alert").textContent).toContain("Số điện thoại phải có 8–15 ký tự");
    expect(create).not.toHaveBeenCalled();
  });

  it("keeps the API validation reason visible inside the booking form", async () => {
    vi.spyOn(frontDeskApi, "guests").mockResolvedValue([{ id: 10, full_name: "Khách demo", identity_number: "123456789", phone: "0912345678", email: null, total_spend: 0 }]);
    vi.spyOn(frontDeskApi, "createReservation").mockRejectedValue(new ApiError(422, {code: "INVALID_STAY", message: "Không thể tạo lượt lưu trú"}));
    render(<FrontDeskPMS onBack={onBack} />);
    await screen.findAllByText("Nguyễn Văn Lễ Tân");
    fireEvent.click(screen.getByRole("button", {name: /Khách hàng/i}));
    fireEvent.click(screen.getByRole("button", {name: "Tạo đặt phòng"}));
    fireEvent.change(screen.getByLabelText("Khách hàng *"), {target: {value: "Khách demo"}});
    fireEvent.click(await screen.findByRole("button", {name: /Khách demo/}));
    fireEvent.change(screen.getByLabelText(/Mã số phòng/), {target: {value: "802"}});
    fireEvent.change(screen.getByLabelText(/Thời gian nhận phòng/), {target: {value: "2035-01-10T14:00"}});
    fireEvent.change(screen.getByLabelText(/Thời gian trả phòng/), {target: {value: "2035-01-12T12:00"}});
    fireEvent.click(screen.getByRole("button", {name: "Tạo lượt lưu trú"}));
    expect((await within(screen.getByRole("form", {name: "Tạo đặt phòng tại quầy"})).findByRole("alert")).textContent).toContain("Không thể tạo lượt lưu trú");
  });

  it("renders Overview screen with KPIs and arrivals / departures tables", async () => {
    render(<FrontDeskPMS onBack={onBack} />);

    // Welcome bar
    expect(screen.getByText(/HỆ THỐNG LỄ TÂN/i)).toBeDefined();
    expect(await screen.findByText(/Khách đến hôm nay/i)).toBeDefined();
    expect(screen.getByText(/Khách trả phòng hôm nay/i)).toBeDefined();
    expect(screen.getByText(/Phòng sẵn sàng/i)).toBeDefined();
    expect(screen.queryByText(/Sạch:/i)).toBeNull();

    // Verify arrivals has action button "Xem phòng"
    const viewRoomBtns = await screen.findAllByText("Xem phòng");
    expect(viewRoomBtns.length).toBeGreaterThan(0);

    // Click "Xem phòng" opens RoomMap and selects that room
    fireEvent.click(viewRoomBtns[0]);
    expect(await screen.findByRole("heading", { name: "Sơ đồ phòng" })).toBeDefined();
  });

  it("shows invoice total, net completed payments and the invoice's remaining balance separately", async () => {
    const invoice = await frontDeskApi.invoice(1001);
    vi.mocked(frontDeskApi.invoice).mockResolvedValue({...invoice,room_total:2500000,service_total:200000,payable:1600000});
    vi.mocked(frontDeskApi.payments).mockResolvedValue([
      {id:1,invoice_id:2001,amount:1000000,method:"CASH",type:"PAYMENT",status:"COMPLETED",reference:null,occurred_at:"2026-10-17T10:00:00",actor_id:"EMP001"},
      {id:2,invoice_id:2001,amount:200000,method:"CASH",type:"PAYMENT",status:"COMPLETED",reference:null,occurred_at:"2026-10-17T11:00:00",actor_id:"EMP001"},
      {id:3,invoice_id:2001,amount:100000,method:"CASH",type:"REFUND",status:"COMPLETED",reference:null,occurred_at:"2026-10-17T11:05:00",actor_id:"EMP001"},
      {id:4,invoice_id:2001,amount:9000000,method:"CARD",type:"PAYMENT",status:"FAILED",reference:null,occurred_at:"2026-10-17T11:10:00",actor_id:"EMP001"},
    ]);
    render(<FrontDeskPMS onBack={onBack} />);
    fireEvent.click(screen.getByRole("button",{name:/Sơ đồ phòng/i}));
    await screen.findByRole("heading", { name: "Sơ đồ phòng" });
    const drawer=await screen.findByLabelText("Chi tiết phòng 203");
    for(const [label,amount] of [["Tổng hóa đơn",2700000],["Đã thanh toán",1100000],["Còn phải thu",1600000]] as const) {
      const row=(await within(drawer).findByText(label)).parentElement!;
      await waitFor(()=>expect(row.textContent?.replace(/\D/g,"")).toBe(String(amount)));
    }
  });



  it("keeps the existing room map and supported drawer actions", async () => {
    render(<FrontDeskPMS onBack={onBack} />);

    // Click navigation to Sơ đồ phòng
    const roomMapNav = screen.getByRole("button", { name: /Sơ đồ phòng/i });
    fireEvent.click(roomMapNav);

    expect(await screen.findByRole("heading", { name: "Sơ đồ phòng" })).toBeDefined();

    // Find list view button and click
    const buttons = screen.getAllByRole("button");
    const listBtn = buttons.find(b => b.innerHTML.includes("lucide-list"));
    if (listBtn) fireEvent.click(listBtn);

    // Check RoomDrawer can switch tabs
    const tabInfo = await screen.findByText("Thông tin");
    const tabServices = screen.getByText("Dịch vụ");
    const tabHistory = screen.getByText("Lịch sử");
    const tabNotes = screen.getByText("Ghi chú");

    expect(tabInfo).toBeDefined();
    expect(screen.getByRole("note").textContent).toMatch(/Dọn phòng và bảo trì do bộ phận chuyên trách xử lý/i);
    expect(screen.queryByRole("button", { name: /Đổi trạng thái phòng/i })).toBeNull();
    fireEvent.click(tabServices);
    expect(screen.getByText(/Dịch vụ phát sinh & minibar/i)).toBeDefined();
    expect(screen.queryByText(/backend|CSDL|database|API/i)).toBeNull();

    fireEvent.click(tabNotes);
    expect(screen.getAllByText(/Ghi chú vận hành/i).length).toBeGreaterThanOrEqual(1);

    fireEvent.click(tabHistory);
    expect(screen.getByText(/Chưa có lịch sử thao tác/i)).toBeDefined();

    expect(screen.queryByRole("button", { name: /Chuyển phòng/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Báo sự cố thiết bị/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /No-show|không đến/i })).toBeNull();

    // Close RoomDrawer
    const closeBtn = buttons.find(b => b.innerHTML.includes("lucide-x"));
    if (closeBtn) {
      fireEvent.click(closeBtn);
      await waitFor(() => {
        expect(screen.queryByText("Tài khoản lưu trú")).toBeNull();
      });
    }
  });

  it("keeps an empty room drawer focused on booking instead of disabled stay actions", async () => {
    render(<FrontDeskPMS onBack={onBack} />);
    fireEvent.click(screen.getByRole("button", { name: /Sơ đồ phòng/i }));
    await screen.findByRole("heading", { name: "Sơ đồ phòng" });
    fireEvent.click(await screen.findByText("104", { exact: true }));

    const drawer = await screen.findByLabelText("Chi tiết phòng 104");
    expect((within(drawer).getByRole("button", { name: "Đặt phòng này" }) as HTMLButtonElement).disabled).toBe(false);
    expect(within(drawer).queryByRole("button", { name: "Trả phòng, thanh toán & biên lai" })).toBeNull();
    expect(within(drawer).queryByRole("button", { name: "Thêm dịch vụ" })).toBeNull();
  });

  it("checks in a confirmed arrival from its room drawer", async () => {
    render(<FrontDeskPMS onBack={onBack} />);
    fireEvent.click(screen.getByRole("button", { name: /Sơ đồ phòng/i }));
    await screen.findByRole("heading", { name: "Sơ đồ phòng" });
    fireEvent.click(await screen.findByText("102", { exact: true }));

    const drawer = await screen.findByLabelText("Chi tiết phòng 102");
    fireEvent.click(within(drawer).getByRole("button", { name: /Nhận phòng/i }));

    await waitFor(() => expect(frontDeskApi.checkIn).toHaveBeenCalledWith(1002, {}, expect.any(String)));
  });

  it("adds a minibar service to the checked-in room and its reservation", async () => {
    const addService = vi.spyOn(frontDeskApi, "addService").mockResolvedValue({} as any);
    render(<FrontDeskPMS onBack={onBack} />);
    fireEvent.click(screen.getByRole("button", { name: /Sơ đồ phòng/i }));
    await screen.findByRole("heading", { name: "Sơ đồ phòng" });
    const drawer = await screen.findByLabelText("Chi tiết phòng 203");
    fireEvent.click(within(drawer).getByRole("button", { name: /Thêm dịch vụ/i }));
    await within(drawer).findByRole("option", { name: /Coca Cola/ });
    fireEvent.change(within(drawer).getByLabelText("Dịch vụ khách đã sử dụng"), { target: { value: "1" } });
    fireEvent.change(within(drawer).getByLabelText("Số lượng dịch vụ"), { target: { value: "2" } });
    fireEvent.click(within(drawer).getByRole("button", { name: "Ghi vào hóa đơn" }));

    await waitFor(() => expect(addService).toHaveBeenCalledWith(1001, {
      service_id: "1", quantity: 2, room_id: "203",
    }, expect.any(String)));
  });

  it("never attaches a checked-in guest action to a room that is being cleaned", async () => {
    vi.mocked(frontDeskApi.dashboard).mockResolvedValue({
      business_date: "2026-09-23", page: 0, size: 100, total_elements: 1, total_pages: 1,
      room_counts: {}, invoice_balances: [], arrivals: [], departures: [], incidents: [],
      rooms: [
        { room_id: "502", name: "502", floor: 5, room_type_id: "STD", room_type_name: "Standard", bed_type: "Đôi", daily_price: 500000, status: "CLEANING" },
        { room_id: "604", name: "604", floor: 6, room_type_id: "STD", room_type_name: "Standard", bed_type: "Đôi", daily_price: 500000, status: "OCCUPIED" },
      ],
      current_stays: [{
        reservation_id: 1001, guest_id: 10, guest_name: "Trần Thị Bình", guest_phone: "0900000000",
        check_in: "2026-09-21T14:00:00", check_out: "2026-09-26T12:00:00", status: "CHECKED_IN",
        invoice_balance: 0,
        // Mô phỏng read-model cũ bị lỗi: vẫn gửi cả phòng nguồn đang dọn.
        room_ids: ["502", "604"],
      }],
    });

    render(<FrontDeskPMS onBack={onBack} />);
    fireEvent.click(screen.getByRole("button", { name: /Sơ đồ phòng/i }));
    expect(await screen.findByRole("heading", { name: "Sơ đồ phòng" })).toBeDefined();

    const drawer = await screen.findByLabelText("Chi tiết phòng 502");
    expect(within(drawer).getByText("Đang dọn")).toBeDefined();
    expect(within(drawer).queryByText("Trần Thị Bình")).toBeNull();
    expect(within(drawer).queryByRole("button", { name: /Chuyển phòng/i })).toBeNull();
  });

  it("shows a future confirmed booking on its room card without marking it occupied", async () => {
    vi.mocked(frontDeskApi.dashboard).mockResolvedValue({
      business_date: "2026-09-23", page: 0, size: 100, total_elements: 1, total_pages: 1,
      room_counts: {}, invoice_balances: [], arrivals: [], departures: [], current_stays: [], incidents: [],
      rooms: [
        { room_id: "504", name: "504", floor: 5, room_type_id: "SUP", room_type_name: "Superior", bed_type: "Đôi", daily_price: 300000, status: "READY" },
      ],
      upcoming_stays: [{
        reservation_id: 8, guest_id: 1, guest_name: "Nguyễn Văn An", guest_phone: "0901234567",
        check_in: "2026-09-24T18:00:00", check_out: "2026-09-24T21:00:00", status: "CONFIRMED",
        invoice_balance: 1230000, room_ids: ["504"],
      }],
    });

    render(<FrontDeskPMS onBack={onBack} />);
    fireEvent.click(screen.getByRole("button", { name: /Sơ đồ phòng/i }));

    const drawer = await screen.findByLabelText("Chi tiết phòng 504");
    expect(within(drawer).getByText("Đã giữ phòng")).toBeDefined();
    expect(within(drawer).queryByText("Có khách")).toBeNull();
    expect(within(drawer).getByText("Nguyễn Văn An")).toBeDefined();
    expect(within(drawer).getByText(/2026-09-24T18:00:00/)).toBeDefined();
  });


  it("navigates to Khách hàng screen, searches and toggles VIP filter", async () => {
    render(<FrontDeskPMS onBack={onBack} />);

    // Navigate to Khách hàng
    const guestsNav = screen.getByRole("button", { name: /Khách hàng/i });
    fireEvent.click(guestsNav);

    expect(await screen.findByText(/Quản lý hồ sơ và trạng thái khách/i)).toBeDefined();

    // Toggle VIP filter
    const vipFilterBtn = screen.getByRole("button", { name: /Lọc VIP/i });
    fireEvent.click(vipFilterBtn);
    expect(screen.getByText(/Chỉ xem VIP/i)).toBeDefined();

    // Search input
    const searchInput = screen.getByPlaceholderText(/Tìm khách, số phòng, mã booking.../i);
    fireEvent.change(searchInput, { target: { value: "KhôngTồnTại12345" } });

    // Switch to Sắp đến tab
    const arrivingTab = screen.getByRole("button", { name: /Sắp đến/i });
    fireEvent.click(arrivingTab);

    // Switch to Trả phòng tab
    const departedTab = screen.getByRole("button", { name: /Trả phòng/i });
    fireEvent.click(departedTab);
  });

  it("keeps only the supported receptionist pages and hides cash handover", async () => {
    render(<FrontDeskPMS onBack={onBack} />);

    await screen.findByText(/HỆ THỐNG LỄ TÂN/i);
    expect(screen.getByRole("button", { name: /Tổng quan/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Sơ đồ phòng/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Khách hàng/i })).toBeDefined();
    expect(screen.queryByRole("button", { name: /Giao ca & Két tiền/i })).toBeNull();
  });

  it("displays accurate Vietnamese empty states when API returns empty collections and zero mock data", async () => {
    vi.spyOn(frontDeskApi, "dashboard").mockResolvedValueOnce({
      business_date: "2026-09-20",
      page: 1,
      size: 10,
      total_elements: 0,
      total_pages: 1,
      room_counts: {},
      invoice_balances: [],
      rooms: [
        { room_id: "101", name: "101", floor: 1, room_type_id: "DELUXE", room_type_name: "Deluxe King", bed_type: "1 Giường King", daily_price: 850000, status: "VACANT" },
      ],
      current_stays: [],
      arrivals: [],
      departures: [],
      incidents: [],
    });

    render(<FrontDeskPMS onBack={onBack} />);

    // Verify empty state messages in Overview
    expect(await screen.findByText("Hôm nay không có khách đến")).toBeDefined();
    expect(screen.getByText("Hôm nay không có khách trả phòng")).toBeDefined();
    expect(screen.getByText("Không có sự cố")).toBeDefined();
    expect(screen.getByText("Chưa có hoạt động nào trong ngày")).toBeDefined();

    // Navigate to Khách hàng
    const guestsNav = screen.getByRole("button", { name: /Khách hàng/i });
    fireEvent.click(guestsNav);

    // Verify empty state message in Guests screen
    expect(await screen.findByText("Chưa có khách đang lưu trú")).toBeDefined();
  });

  it("displays canonical status 'Đã giữ phòng' (reserved) for reserved rooms", async () => {
    vi.spyOn(frontDeskApi, "dashboard").mockResolvedValueOnce({
      business_date: "2026-09-20",
      page: 1,
      size: 10,
      total_elements: 1,
      total_pages: 1,
      room_counts: { reserved: 1 },
      invoice_balances: [],
      rooms: [
        { room_id: "305", name: "305", floor: 3, room_type_id: "DELUXE", room_type_name: "Deluxe King", bed_type: "1 Giường King", daily_price: 900000, status: "reserved" },
      ],
      current_stays: [],
      arrivals: [],
      departures: [],
      incidents: [],
    });

    render(<FrontDeskPMS onBack={onBack} />);

    // Navigate to Sơ đồ phòng
    const roomMapNav = screen.getByRole("button", { name: /Sơ đồ phòng/i });
    fireEvent.click(roomMapNav);

    // Should find the tab "Đã giữ phòng (1)"
    expect(await screen.findByRole("button", { name: /Đã giữ phòng \(1\)/i })).toBeDefined();

    // Room card should display badge "Đã giữ phòng"
    const badges = screen.getAllByText("Đã giữ phòng");
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it("settles checkout through the existing atomic room-return flow", async () => {
    const checkout = vi.spyOn(frontDeskApi, "checkOut").mockResolvedValue({
      id: 2001, reservation_id: 1001, issued_at: "2026-09-20T14:00:00", payable: 0,
      room_total: 1200000, service_total: 0, late_surcharge: 0, compensation: 0, extension_total: 0,
      adjustment_total: 0, discount: 0, payment_method: "CASH", status: "DA_THANH_TOAN",
    });
    render(<FrontDeskPMS onBack={onBack} />);
    fireEvent.click(screen.getByRole("button", { name: /Sơ đồ phòng/i }));
    const drawer = await screen.findByLabelText("Chi tiết phòng 203");
    fireEvent.click(within(drawer).getByRole("button", { name: "Trả phòng, thanh toán & biên lai" }));
    await waitFor(() => expect(checkout).toHaveBeenCalledWith(1001, expect.objectContaining({payment_method:"CASH"}), expect.any(String)));
    expect(checkout).toHaveBeenCalledTimes(1);
    expect(await within(drawer).findByText(/Hoàn tất/)).toBeTruthy();
  });

  it("does not reopen a second settlement workflow after checkout", async () => {
    const dashboard: Awaited<ReturnType<typeof frontDeskApi.dashboard>> = await vi.mocked(frontDeskApi.dashboard)({});
    const reservation = await vi.mocked(frontDeskApi.reservation)(1001);
    vi.mocked(frontDeskApi.reservation).mockResolvedValue({ ...reservation, status: "CHECKED_OUT" });
    vi.mocked(frontDeskApi.dashboard).mockResolvedValue({ ...dashboard, current_stays: [], invoice_balances: [],
      rooms: dashboard.rooms.map(room => ({ ...room, status: "CLEANING" })) });
    render(<FrontDeskPMS onBack={onBack} />);
    await screen.findByText(/HỆ THỐNG LỄ TÂN/i);
    expect(screen.queryByRole("button", { name: "Tiếp tục quyết toán BK-1001" })).toBeNull();
    expect(frontDeskApi.checkOut).not.toHaveBeenCalled();
  });

  it("shows error banner and retry button on API failure without mock data fallback", async () => {
    const errorSpy = vi.spyOn(frontDeskApi, "dashboard").mockRejectedValueOnce(new Error("Lỗi kết nối cơ sở dữ liệu"));

    render(<FrontDeskPMS onBack={onBack} />);

    expect(await screen.findByRole("alert")).toBeDefined();
    expect(screen.getByText(/Không tải được thông tin vận hành/i)).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /Sơ đồ phòng/i }));
    expect(screen.getByRole("alert").textContent).toContain("Không tải được thông tin vận hành");
    expect(screen.queryByText("Chưa có dữ liệu phòng từ hệ thống")).toBeNull();

    const retryBtn = screen.getByRole("button", { name: /Thử lại/i });
    expect(retryBtn).toBeDefined();

    // Clicking retry calls dashboard again
    fireEvent.click(retryBtn);
    expect(errorSpy).toHaveBeenCalledTimes(2);
    expect(await screen.findByRole("button", { name: "Tất cả (5)" })).toBeDefined();
  });
});
