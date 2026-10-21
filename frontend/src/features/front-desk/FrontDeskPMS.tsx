import type { Room, OccStatus, CleanStatus, VipTier, FolioItem } from "./types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { authApi } from "../../shared/api/auth";
import { ApiError, apiClient, apiErrorMessage } from "../../shared/api/client";
import { frontDeskApi, newFrontDeskIdempotencyKey } from "../../shared/api/frontDesk";
import { EmployeeProfileDropdown } from "../../shared/components/EmployeeProfileDropdown";
import type { Dashboard, DashboardItem, Guest, Invoice, PaymentMethod, Receipt as ReceiptDto, Reservation, ServiceCatalogItem, TimelineEvent } from "../../shared/types/frontDesk";
import { formatDateTimeVi } from "../../shared/utils/localDate";
import { formatUsd, formatVnd } from "../../shared/utils/money";
import { Search, Bell, Home, LayoutGrid, Users, CheckCircle2, XCircle, Sparkles, AlertCircle, User, Ban, MoreHorizontal, ChevronDown, ChevronRight, X, List, ArrowUpRight, Crown, LogOut, BedDouble, Pencil, ClipboardList, Receipt, Clock, ArrowDownLeft, ArrowUpLeft, Banknote, CalendarDays, PlusCircle, Filter, Phone } from "lucide-react";

/* ══════════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════════ */
type NavPage = "overview" | "rooms" | "guests";

interface ArrivingGuest {
  id: string; name: string; room: string; type: string; booking: string;
  ci: string; co: string; vip: string | null; phone: string; reservationId?: number;
}

interface DepartureGuest {
  id: string; name: string; room: string; type: string; balanceOk: boolean;
  status: "pending" | "overdue" | "dnd"; reservationId?: number;
}
interface OverviewArrival { id: string; name: string; room: string; type: string; booking: string; eta: string; vip: string | null; status: "expected" | "early"; }
interface LiveAlert { id: string; type: "error" | "warning" | "info" | "success"; msg: string; time: string; }
interface LiveActivity { id: string; time: string; msg: string; icon: string; }

/* ══════════════════════════════════════════════════════════
   STATUS CONFIGS
══════════════════════════════════════════════════════════ */
const OCC_CFG: Record<OccStatus, { labelVi: string; bg: string; text: string; dot: string }> = {
  vacant:   { labelVi:"Chưa có khách", bg:"#DCFCE7", text:"#166534", dot:"#16A34A" },
  reserved: { labelVi:"Đã giữ phòng", bg:"#FEF3C7", text:"#92400E", dot:"#F59E0B" },
  occupied: { labelVi:"Đang có khách", bg:"#DBEAFE", text:"#1D4ED8", dot:"#3B82F6" },
  dnd:      { labelVi:"Không làm phiền", bg:"#FFE4E6", text:"#BE123C", dot:"#F43F5E" },
  ood:      { labelVi:"Ngoài hoạt động", bg:"#FFE4E6", text:"#BE123C", dot:"#F43F5E" },
};
const CLN_CFG: Record<CleanStatus, { labelVi: string; bg: string; text: string; dot: string }> = {
  clean:    { labelVi:"Sẵn sàng", bg:"#DCFCE7", text:"#166534", dot:"#16A34A" },
  cleaning: { labelVi:"Đang dọn", bg:"#FEF9C3", text:"#854D0E", dot:"#CA8A04" },
  dirty:    { labelVi:"Cần dọn", bg:"#FEF3C7", text:"#92400E", dot:"#F59E0B" },
};

const roomTypeLabel = (type: string) => ({
  "Standard Room":"Phòng tiêu chuẩn", "Deluxe King":"Deluxe giường King", "Deluxe Twin":"Deluxe hai giường",
  "Superior Queen":"Superior giường Queen", "Superior Twin":"Superior hai giường", "Executive Suite":"Suite điều hành",
}[type] ?? type);
const bedLabel = (beds: string) => beds.replace("1 King","1 giường King").replace("2 Twin","2 giường đơn").replace("1 Queen","1 giường Queen").replace("1 Double","1 giường đôi").replace(" + Lounge"," + phòng khách");

/* ══════════════════════════════════════════════════════════
   UTILITIES
══════════════════════════════════════════════════════════ */
const fmtVND = formatVnd;
const fmtUSD = formatUsd;
const fmtItem = (item: FolioItem, cur?: "$" | "VND") =>
  cur === "$" ? fmtUSD(item.amount) : fmtVND(item.amount);
const serviceUnitLabel = (service: ServiceCatalogItem) => service.unit?.trim() || "dịch vụ";
const servicePriceLabel = (service: ServiceCatalogItem) =>
  service.price > 0 ? `${fmtVND(service.price)} / ${serviceUnitLabel(service)}` : "Chưa niêm yết giá";
const serviceAvailabilityLabel = (service: ServiceCatalogItem) =>
  service.active === false ? "Ngừng phục vụ" : "Đang phục vụ";
const reservationIdFromRoom = (room: Room) => room.reservationId ?? Number(room.bookingId?.match(/\d+/)?.[0]);
const apiErrorText = (error: unknown) => {
  if (!(error instanceof ApiError)) return "Không thể kết nối hệ thống. Vui lòng thử lại.";
  if (error.status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  if (error.status === 403) return "Tài khoản Lễ tân không có quyền thực hiện thao tác này.";
  if (error.status === 404) return "Không tìm thấy thông tin lưu trú.";
  if (error.status === 409) return apiErrorMessage(error, "Dữ liệu vừa thay đổi hoặc phòng không còn khả dụng.");
  if (error.status === 400 || error.status === 422) return apiErrorMessage(error, "Dữ liệu nghiệp vụ không hợp lệ.");
  if (error.status === 429) return "Thao tác quá nhanh. Vui lòng chờ rồi thử lại.";
  return "Không thể hoàn tất thao tác. Vui lòng thử lại.";
};
const fmtDateTime = formatDateTimeVi;
const localDateTimeNow = () => {
  const now = new Date();
  const part = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${part(now.getMonth()+1)}-${part(now.getDate())}T${part(now.getHours())}:${part(now.getMinutes())}:${part(now.getSeconds())}`;
};
const paymentMethodLabel = (method: PaymentMethod) => ({
  CASH: "Tiền mặt",
  CARD: "Thẻ",
  BANK_TRANSFER: "Chuyển khoản ngân hàng",
}[method] ?? method);
const printReceipt = (receipt: ReceiptDto, room: Room, invoice: Invoice, reservationRooms: Room[], services: ServiceCatalogItem[], reservation?: Reservation | null): boolean => {
  try {
    const popup = window.open("", "_blank", "width=680,height=900");
    if (!popup) {
      console.warn("Trình duyệt đang chặn cửa sổ in biên lai.");
      return false;
    }
    const safe = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]!));
    const adjustment = invoice.adjustment_total;
    const roomIds = new Set(reservation?.rooms?.map(line => line.room_id) ?? reservationRooms.map(item => item.id));
    const roomLabels = [...roomIds].map(id => {
      const matchedRoom = reservationRooms.find(item => item.id === id);
      return matchedRoom ? `${matchedRoom.number} (${roomTypeLabel(matchedRoom.type)})` : id;
    });
    const serviceUsageLines = reservation?.service_usages ?? [];
    const serviceUsageTotal = serviceUsageLines.reduce((sum, item) => sum + item.amount, 0);
    const serviceRemainder = invoice.service_total - serviceUsageTotal;
    const detailedServiceRows = serviceRemainder >= 0
      ? [
          ...serviceUsageLines.map(item => {
            const serviceName = item.service_name?.trim() || services.find(service => service.id === item.service_id)?.name || item.service_id;
            const usedOn = item.used_on ? new Date(`${item.used_on}T00:00:00`).toLocaleDateString("vi-VN") : "—";
            return { label: `${serviceName} · ${item.quantity} × ${fmtVND(item.unit_price)} · ngày ${usedOn}`, amount: item.amount };
          }),
          ...(serviceRemainder > 0 ? [{ label: "Dịch vụ phát sinh / minibar khác", amount: serviceRemainder }] : []),
        ]
      : (invoice.service_total !== 0 ? [{ label: "Dịch vụ đã sử dụng / minibar", amount: invoice.service_total }] : []);
    const chargeRows = [
      { label: "Tiền phòng", amount: invoice.room_total },
      ...detailedServiceRows,
      { label: "Phụ thu trả muộn", amount: invoice.late_surcharge },
      { label: "Gia hạn thời gian lưu trú", amount: invoice.extension_total },
      { label: "Bồi thường thiết bị", amount: invoice.compensation },
      ...(adjustment > 0 ? [{ label: "Điều chỉnh tăng", amount: adjustment }] : []),
      ...(adjustment < 0 ? [{ label: "Điều chỉnh giảm", amount: adjustment }] : []),
      ...(invoice.discount > 0 ? [{ label: "Giảm giá / ưu đãi", amount: -invoice.discount }] : []),
    ].filter(item => item.amount !== 0);
    const rawTotal = Math.max(0, chargeRows.reduce((sum, item) => sum + item.amount, 0));
    // Keep in sync with BillingService: the final invoice total is rounded to the nearest 1,000 VND.
    const invoiceTotal = rawTotal;
    const amountRows = chargeRows.map(item => `<tr><td>${safe(item.label)}</td><td class="amount${item.amount < 0 ? " deduction" : ""}">${item.amount < 0 ? "−" : ""}${safe(fmtVND(Math.abs(item.amount)))}</td></tr>`).join("");
    const reservationLines = reservation?.rooms ?? [];
    const checkIn = reservationLines.map(line => line.expected_check_in).filter(Boolean).sort()[0] ?? room.checkIn;
    const checkOut = reservationLines.map(line => line.expected_check_out).filter(Boolean).sort().at(-1) ?? room.checkOut;
    const stayDates = checkIn || checkOut
      ? `${fmtDateTime(checkIn)} – ${fmtDateTime(checkOut)}`
      : "—";
    popup.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Biên lai ${safe(receipt.receipt_number)}</title><style>
      *{box-sizing:border-box}body{font-family:Arial,"Helvetica Neue",sans-serif;color:#172033;margin:0;padding:24px;background:#fff;font-size:13px;line-height:1.45}.receipt{max-width:720px;margin:0 auto}.brand{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;padding-bottom:18px;border-bottom:2px solid #1d4ed8}.brand h1{font-size:25px;letter-spacing:-.5px;color:#12356b;margin:0 0 4px}.brand p,.muted{margin:0;color:#64748b}.brand p{font-size:12px}.document-title{text-align:right;color:#1d4ed8;font-weight:800;letter-spacing:.08em;font-size:12px}.document-title strong{display:block;margin-top:5px;color:#172033;letter-spacing:0;font-size:17px}.section{margin-top:20px}.section-title{margin:0 0 8px;color:#334155;font-size:11px;letter-spacing:.08em;text-transform:uppercase}.meta{display:grid;grid-template-columns:1fr 1fr;border:1px solid #dbe3ef;border-radius:8px;overflow:hidden}.meta-item{padding:9px 12px;border-bottom:1px solid #e8edf5}.meta-item:nth-child(odd){border-right:1px solid #e8edf5}.meta-item:nth-last-child(-n+2){border-bottom:0}.meta-item span{display:block;color:#64748b;font-size:11px;margin-bottom:2px}.meta-item strong{font-size:13px;overflow-wrap:anywhere}.charges{width:100%;border-collapse:collapse;border:1px solid #dbe3ef;border-radius:8px;overflow:hidden}.charges th{background:#f3f6fb;color:#475569;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;padding:9px 12px}.charges th:last-child,.charges td.amount{text-align:right}.charges td{padding:9px 12px;border-top:1px solid #e8edf5}.charges .amount{white-space:nowrap;font-variant-numeric:tabular-nums}.deduction{color:#166534}.charges tfoot td{font-weight:800;background:#f8fafc;border-top:2px solid #cbd5e1}.settlement{display:grid;grid-template-columns:1fr auto;align-items:center;gap:8px 20px;margin-top:14px;padding:15px 16px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:9px}.settlement span{color:#334155}.settlement strong{text-align:right;font-size:21px;color:#1d4ed8;font-variant-numeric:tabular-nums}.settlement small{grid-column:1/-1;color:#64748b;font-size:11px}.extra{display:flex;justify-content:space-between;gap:12px;margin-top:10px;color:#475569;font-size:12px}.footer{border-top:1px solid #e2e8f0;margin-top:22px;padding-top:12px;color:#64748b;font-size:11px;display:flex;justify-content:space-between;gap:12px}.thanks{text-align:center;margin:18px 0 0;color:#334155;font-weight:600}button{display:block;margin:22px auto 0;padding:10px 22px;border:0;border-radius:6px;background:#1d4ed8;color:#fff;font-size:13px;font-weight:700;cursor:pointer}@page{size:A4;margin:14mm}@media print{body{padding:0}.receipt{max-width:none}button{display:none}.brand,.settlement,.meta-item,.charges tr{break-inside:avoid}.charges thead{display:table-header-group}}
      </style></head><body><main class="receipt"><header class="brand"><div><h1>MaM Hotel</h1><p>Thông tin thanh toán lưu trú</p></div><div class="document-title">BIÊN LAI THANH TOÁN<strong>${safe(receipt.receipt_number)}</strong></div></header>
      <section class="section"><h2 class="section-title">Thông tin khách và lưu trú</h2><div class="meta">
        <div class="meta-item"><span>Khách hàng</span><strong>${safe(room.guestName ?? "—")}</strong></div><div class="meta-item"><span>Điện thoại</span><strong>${safe(room.guestPhone ?? "—")}</strong></div>
        <div class="meta-item"><span>Phòng lưu trú</span><strong>${safe(roomLabels.length ? roomLabels.join(", ") : `${room.number} (${roomTypeLabel(room.type)})`)}</strong></div><div class="meta-item"><span>Mã đặt phòng</span><strong>${safe(room.bookingId ?? (invoice.reservation_id ? `BK-${invoice.reservation_id}` : "—"))}</strong></div>
        <div class="meta-item"><span>Hóa đơn</span><strong>#${safe(invoice.id)}</strong></div><div class="meta-item"><span>Thời gian lưu trú</span><strong>${safe(stayDates)}</strong></div>
      </div></section>
      <section class="section"><h2 class="section-title">Chi tiết các khoản trên hóa đơn</h2><table class="charges"><thead><tr><th>Nội dung thu</th><th>Thành tiền</th></tr></thead><tbody>${amountRows || `<tr><td colspan="2" class="muted">Không phát sinh khoản thu trên hóa đơn.</td></tr>`}</tbody><tfoot><tr><td>Tổng hóa đơn</td><td class="amount">${safe(fmtVND(invoiceTotal))}</td></tr></tfoot></table>
      </section>
      <section class="settlement" aria-label="Số tiền thu theo biên lai"><span>Số tiền khách thanh toán lần này</span><strong>${safe(fmtVND(receipt.amount))}</strong><small>Phương thức: ${safe(paymentMethodLabel(receipt.method))}. Đây là số tiền được ghi nhận trong biên lai này.</small></section>
      <footer class="footer"><span>Phát hành: ${safe(fmtDateTime(receipt.issued_at))}</span><span>Nhân viên: ${safe(receipt.issued_by)}</span></footer><p class="thanks">Cảm ơn Quý khách đã lưu trú tại MaM Hotel.</p><button type="button" onclick="window.print()">In biên lai</button></main><script>window.onload=()=>window.print()</script></body></html>`);
    popup.document.close();
    return true;
  } catch (error) {
    console.warn("Lỗi mở popup in biên lai:", error);
    return false;
  }
};

/* ══════════════════════════════════════════════════════════
   BADGE COMPONENTS
══════════════════════════════════════════════════════════ */
function OccBadge({ s }: { s: OccStatus }) {
  const c = OCC_CFG[s] ?? OCC_CFG.vacant;
  const Icon = s === "occupied" ? User : s === "dnd" ? Ban : s === "ood" ? XCircle : s === "reserved" ? CalendarDays : CheckCircle2;
  return (
    <span style={{ display:"inline-flex",alignItems:"center",gap:4,fontSize:11,fontWeight:500,
      padding:"2px 8px",borderRadius:99,background:c.bg,color:c.text }}>
      <Icon size={10} style={{ color:c.dot }} strokeWidth={2.5} />
      {c.labelVi}
    </span>
  );
}
function ClnBadge({ s }: { s: CleanStatus }) {
  const c = CLN_CFG[s];
  const Icon = s === "clean" ? CheckCircle2 : s === "cleaning" ? Sparkles : AlertCircle;
  return (
    <span style={{ display:"inline-flex",alignItems:"center",gap:4,fontSize:11,fontWeight:500,
      padding:"2px 8px",borderRadius:99,background:c.bg,color:c.text }}>
      <Icon size={10} style={{ color:c.dot }} strokeWidth={2.5} />
      {c.labelVi}
    </span>
  );
}
function VipBadge({ tier }: { tier: VipTier }) {
  const cfg = { silver:{bg:"#F1F5F9",text:"#475569",star:"#94A3B8",label:"Bạc"},
    gold:{bg:"#FEF9C3",text:"#92400E",star:"#EAB308",label:"Vàng"},
    platinum:{bg:"#1E1B4B",text:"#C7D2FE",star:"#818CF8",label:"Bạch kim"} };
  const c = cfg[tier];
  return (
    <span style={{ display:"inline-flex",alignItems:"center",gap:4,fontSize:11,fontWeight:700,
      padding:"2px 8px",borderRadius:5,background:c.bg,color:c.text }}>
      <span style={{ color:c.star }}>★</span> VIP {c.label}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════
   ROOM CARD
══════════════════════════════════════════════════════════ */
function RoomCard({ room, selected, onClick }: { room: Room; selected: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  const isDND = room.occStatus === "dnd";
  const isOOO = room.occStatus === "ood";
  const isReserved = room.occStatus === "reserved";
  const isOcc = room.occStatus === "occupied" || isDND;

  let bIcon: React.ElementType | null = null, bMsg = "";
  if (isOOO)                               { bIcon = XCircle;      bMsg = "Bảo trì / Ngoài hoạt động"; }
  else if (isDND)                          { bIcon = Pencil;       bMsg = "Không làm phiền"; }
  else if (isReserved)                     { bIcon = CalendarDays; bMsg = "Đã giữ phòng — chờ check-in"; }
  else if (!isOcc && room.cleanStatus === "cleaning") { bIcon = Sparkles;     bMsg = "Đang dọn phòng"; }
  else if (!isOcc && room.cleanStatus === "dirty")    { bIcon = ClipboardList;bMsg = "Cần dọn phòng"; }
  else if (!isOcc)                         { bIcon = BedDouble;    bMsg = "Sẵn sàng đón khách"; }

  const hasGuestInfo = (isOcc || isReserved) && !isDND && Boolean(room.guestName);

  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ background:"#FFF",cursor:"pointer",borderRadius:10,
        border:selected?"2px solid #3B82F6":`1px solid ${hov?"#CBD5E1":"#E2E8F0"}`,
        boxShadow:selected?"0 0 0 3px rgba(59,130,246,.14),0 2px 8px rgba(0,0,0,.07)":
          hov?"0 2px 8px rgba(0,0,0,.06)":"0 1px 3px rgba(0,0,0,.04)",
        padding:selected?"13px 15px":"14px 16px",transition:"box-shadow .12s,border-color .12s" }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:2 }}>
        <span style={{ fontSize:19,fontWeight:700,color:"#0F172A" }}>{room.number}</span>
        <button onClick={e=>e.stopPropagation()} style={{ color:"#CBD5E1",cursor:"pointer",padding:2 }}>
          <MoreHorizontal size={14} />
        </button>
      </div>
      <p style={{ fontSize:12,color:"#64748B",marginBottom:10 }}>{roomTypeLabel(room.type)}</p>
      <p style={{ fontSize:12,fontWeight:650,color:"#0F766E",marginBottom:10,fontVariantNumeric:"tabular-nums" }}>
        {room.dailyPrice != null ? `${fmtVND(room.dailyPrice)} / đêm` : "Chưa có giá niêm yết"}
      </p>
      <div style={{ display:"flex",alignItems:"center",gap:5,marginBottom:10,flexWrap:"wrap" }}>
        <OccBadge s={room.occStatus} /> <ClnBadge s={room.cleanStatus} />
      </div>
      {hasGuestInfo ? (
        <div>
          <div style={{ display:"flex",alignItems:"center",gap:5,marginBottom:2 }}>
            <User size={11} style={{ color:"#94A3B8",flexShrink:0 }} />
            <span style={{ fontSize:12,fontWeight:600,color:"#334155",
              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{room.guestName}</span>
          </div>
          {(room.checkIn||room.checkOut) && (
            <p style={{ fontSize:11,color:"#94A3B8",paddingLeft:16 }}>
              Nhận: {fmtDateTime(room.checkIn)} | Trả: {fmtDateTime(room.checkOut)}
            </p>
          )}
        </div>
      ) : (
        <div style={{ display:"flex",alignItems:"center",gap:5 }}>
          {bIcon && <span style={{ color:"#94A3B8",display:"flex",flexShrink:0 }}>
            {(() => { const I = bIcon!; return <I size={11} />; })()}
          </span>}
          <span style={{ fontSize:11,color:"#94A3B8" }}>{bMsg}</span>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ROOM DRAWER
══════════════════════════════════════════════════════════ */
function RoomDrawer({ room, rooms, onClose, onRefresh, onCheckIn, onSettlementChange, onCreateBooking }: { room: Room; rooms: Room[]; onClose: () => void; onRefresh: () => Promise<void> | void; onCheckIn?: (resId: number) => Promise<void>; onSettlementChange: (active: boolean) => void; onCreateBooking?: (room: Room) => void }) {
  const reservationId = reservationIdFromRoom(room);
  const validReservation = Number.isSafeInteger(reservationId) && reservationId > 0;
  const isCheckedIn = room.reservationStatus === "CHECKED_IN";
  const shouldLoadInvoice = isCheckedIn || room.reservationStatus === "CHECKED_OUT";
  const canCheckIn = validReservation && (room.reservationStatus === "CONFIRMED" || (!room.reservationStatus && room.occStatus === "vacant" && Boolean(room.guestName)));
  const canCancel = validReservation && ["DRAFT", "CONFIRMED"].includes(room.reservationStatus || "");

  const [tab, setTab] = useState<"info"|"service"|"history"|"notes">("info");
  const [services, setServices] = useState<ServiceCatalogItem[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [serviceQuantity, setServiceQuantity] = useState(1);
  const [serviceMealPeriod, setServiceMealPeriod] = useState<"LUNCH" | "DINNER">("LUNCH");
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [invoiceChecked, setInvoiceChecked] = useState(false);
  const [reservationDetails, setReservationDetails] = useState<Reservation | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentsLoaded, setPaymentsLoaded] = useState(false);
  const [receipts, setReceipts] = useState<ReceiptDto[]>([]);

  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "error" | "success" | "info"; text: string } | null>(null);
  const [operation, setOperation] = useState<"cancel" | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const [checkoutStep, setCheckoutStep] = useState<"idle" | "done">("idle");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [issuedReceipt, setIssuedReceipt] = useState<ReceiptDto | null>(null);

  const selectedService = services.find(service => service.id === serviceId);
  const serviceQuantityAvailable = Boolean(selectedService && selectedService.active !== false);
  const canRecordService = Boolean(
    validReservation &&
    selectedService &&
    selectedService.price >= 0 &&
    invoiceChecked && !invoice &&
    serviceQuantity >= 1 &&
    serviceQuantityAvailable &&
    busy === null &&
    (room.reservationStatus === undefined || room.reservationStatus === "CHECKED_IN")
  );

  const keys = useRef({
    service: newFrontDeskIdempotencyKey(),
    checkout: newFrontDeskIdempotencyKey(),
    cancel: newFrontDeskIdempotencyKey(),
  });

  const folioTotal = invoice ? Math.max(0, invoice.room_total + invoice.service_total + invoice.late_surcharge + invoice.compensation + invoice.extension_total + invoice.adjustment_total - invoice.discount) : room.folioTotal;
  const folio = invoice ? { total: fmtVND(folioTotal ?? 0), paid: paymentsLoaded ? fmtVND(payments.filter(payment => payment.status === "COMPLETED").reduce((sum, payment) => sum + (payment.type === "REFUND" ? -1 : 1) * payment.amount, 0)) : "Chưa tải được số thực thu", due: fmtVND(invoice.payable) } : null;
  const TABS  = [
    {id:"info",label:"Thông tin"},{id:"service",label:"Dịch vụ"},
    {id:"history",label:"Lịch sử"},{id:"notes",label:"Ghi chú"},
  ] as const;

  const loadDetails = useCallback(async () => {
    if (!validReservation) return;
    const [catalogResult, timelineResult, invoiceResult, reservationResult] = await Promise.allSettled([
      frontDeskApi.services(), frontDeskApi.timeline(reservationId),
      shouldLoadInvoice ? frontDeskApi.invoice(reservationId) : Promise.resolve(null),
      frontDeskApi.reservation(reservationId),
    ]);
    if (catalogResult.status === "fulfilled") setServices(catalogResult.value.filter(item => item.active !== false));
    if (timelineResult.status === "fulfilled") setTimeline(timelineResult.value);
    if (reservationResult.status === "fulfilled") setReservationDetails(reservationResult.value);
    const invoiceMissing = invoiceResult.status === "rejected" && invoiceResult.reason instanceof ApiError
      && (invoiceResult.reason.status === 404 || invoiceResult.reason.code === "INVOICE_NOT_FOUND");
    setInvoiceChecked(invoiceResult.status === "fulfilled" || invoiceMissing);
    if (invoiceMissing || (invoiceResult.status === "fulfilled" && !invoiceResult.value)) setInvoice(null);
    if (invoiceResult.status === "rejected" && !invoiceMissing) {
      setFeedback({tone:"error",text:"Không thể kiểm tra hóa đơn. Vui lòng mở lại phòng để thử lại trước khi ghi/hủy dịch vụ."});
    }
    if (invoiceResult.status === "fulfilled" && invoiceResult.value) {
      setInvoice(invoiceResult.value);
      try {
        const [payRes, recRes] = await Promise.allSettled([
          frontDeskApi.payments(invoiceResult.value.id),
          frontDeskApi.receipts(invoiceResult.value.id),
        ]);
        if (payRes.status === "fulfilled") { setPayments(Array.isArray(payRes.value) ? payRes.value : (payRes.value as any)?.items ?? []); setPaymentsLoaded(true); } else { setPaymentsLoaded(false); }
        if (recRes.status === "fulfilled") setReceipts(Array.isArray(recRes.value) ? recRes.value : (recRes.value as any)?.items ?? []);
      } catch {}
    }
  }, [shouldLoadInvoice, reservationId, validReservation]);

  useEffect(() => {
    setFeedback(null); setOperation(null); setCheckoutStep(room.reservationStatus === "CHECKED_OUT" ? "done" : "idle"); setIssuedReceipt(null);
    setReservationDetails(null); setServices([]); setInvoice(null); setInvoiceChecked(false); setPayments([]); setPaymentsLoaded(false); setReceipts([]);
    setCancelReason("");
    keys.current = {
      service: newFrontDeskIdempotencyKey(),
      checkout: newFrontDeskIdempotencyKey(),
      cancel: newFrontDeskIdempotencyKey(),
    };
    void loadDetails();
  }, [loadDetails, room.id, room.reservationStatus]);

  const finishMutation = async (message: string) => {
    setFeedback({ tone: "success", text: message });
    await Promise.all([Promise.resolve(onRefresh()), loadDetails()]);
  };

  const handleCheckInAction = async () => {
    if (!validReservation || busy) return;
    setBusy("checkin"); setFeedback(null);
    try {
      if (onCheckIn) {
        await onCheckIn(reservationId);
      } else {
        await frontDeskApi.checkIn(reservationId, {}, newFrontDeskIdempotencyKey());
      }
      await finishMutation("Đã nhận phòng thành công.");
    } catch (error) {
      setFeedback({ tone: "error", text: apiErrorText(error) });
    } finally {
      setBusy(null);
    }
  };

  const cancelReservation = async () => {
    if (!validReservation || !cancelReason.trim() || busy) return;
    setBusy("cancel"); setFeedback(null);
    try {
      await frontDeskApi.cancel(reservationId, cancelReason.trim(), keys.current.cancel);
      keys.current.cancel = newFrontDeskIdempotencyKey(); setOperation(null);
      await finishMutation("Đã hủy đặt phòng thành công.");
    } catch (error) { setFeedback({ tone: "error", text: apiErrorText(error) }); }
    finally { setBusy(null); }
  };

  const addService = async () => {
    if (!canRecordService) return;
    setBusy("service"); setFeedback(null);
    try {
      await frontDeskApi.addService(reservationId, { service_id: serviceId, quantity: serviceQuantity,
        room_id: room.id, ...(serviceId === "MAMREST" ? { meal_period: serviceMealPeriod } : {}) }, keys.current.service);
      keys.current.service = newFrontDeskIdempotencyKey(); setServiceQuantity(1);
      await finishMutation("Đã ghi nhận dịch vụ/minibar vào booking.");
    } catch (error) { setFeedback({ tone: "error", text: apiErrorText(error) }); }
    finally { setBusy(null); }
  };

  const reviewCheckout = async () => {
    if (!validReservation || busy) return;
    setBusy("review"); setFeedback(null);
    onSettlementChange(true);
    try {
      const finalInvoice = await frontDeskApi.checkOut(reservationId, { at: localDateTimeNow(), payment_method: paymentMethod }, keys.current.checkout);
      keys.current.checkout = newFrontDeskIdempotencyKey();
      setInvoice(finalInvoice); setCheckoutStep("done"); setTab("info");
      const receiptResult = await frontDeskApi.receipts(finalInvoice.id);
      const issued = Array.isArray(receiptResult) ? receiptResult[0] : receiptResult.items?.[0];
      setReceipts(issued ? [issued] : []); setIssuedReceipt(issued ?? null);
      setFeedback({ tone: "success", text: issued
        ? `Đã trả phòng, ghi nhận thanh toán và phát hành biên lai ${issued.receipt_number}.`
        : "Đã hoàn tất trả phòng. Hóa đơn không còn khoản phải thu." });
    } catch (error) { onSettlementChange(false); setFeedback({ tone: "error", text: `Không thể hoàn tất trả phòng và lập hóa đơn: ${apiErrorText(error)}` }); }
    finally { setBusy(null); }
  };


  return (
    <div className="frontdesk-room-drawer" aria-label={`Chi tiết phòng ${room.number}`} style={{ background:"#FFF",borderLeft:"1px solid #E2E8F0",
      display:"flex",flexDirection:"column",flexShrink:0,overflow:"hidden" }}>
      {/* Header */}
      <div className="frontdesk-room-drawer__header" style={{ padding:"16px 20px 0",borderBottom:"1px solid #E2E8F0",flexShrink:0 }}>
        <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12 }}>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{display:"flex",alignItems:"baseline",gap:8,flexWrap:"wrap",marginBottom:2}}>
              <p style={{ fontSize:24,fontWeight:800,color:"#0F172A" }}>Phòng {room.number}</p>
              <span style={{fontSize:10,fontWeight:700,color:"#64748B",background:"#F1F5F9",border:"1px solid #E2E8F0",borderRadius:5,padding:"2px 6px"}}>room_id {room.id}</span>
            </div>
            <p style={{ fontSize:13,color:"#64748B" }}>{roomTypeLabel(room.type)}</p>
            <div style={{ display:"flex",gap:6,marginTop:8 }}>
              {checkoutStep === "idle" ? <><OccBadge s={room.occStatus} /> <ClnBadge s={room.cleanStatus} /></> : <span style={{fontSize:11,color:"#166534"}}>Đã trả phòng · Đang quyết toán BK-{reservationId}</span>}
            </div>
          </div>
          <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6 }}>
            <button onClick={onClose} aria-label="Đóng chi tiết phòng"
              style={{ color:"#94A3B8",cursor:"pointer",padding:4,borderRadius:6,
                background:"#F8FAFC",border:"1px solid #E2E8F0",display:"flex" }}>
              <X size={13} />
            </button>
            <div style={{ width:90,height:60,borderRadius:8,overflow:"hidden",background:"#E2E8F0" }}>
              <img src="https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=180&h=120&fit=crop&auto=format"
                alt="Phòng" style={{ width:"100%",height:"100%",objectFit:"cover" }} />
            </div>
          </div>
        </div>
        <div style={{ display:"flex",gap:0 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{ padding:"8px 14px",fontSize:12,fontWeight:tab===t.id?600:400,
                color:tab===t.id?"#16A34A":"#64748B",cursor:"pointer",
                borderBottom:tab===t.id?"2px solid #16A34A":"2px solid transparent",
                background:"transparent",whiteSpace:"nowrap" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable body */}
      <div className="frontdesk-room-drawer__body" style={{ flex:1,overflowY:"auto",padding:"16px 20px" }}>
        {tab === "info" && (
          <>
            <p style={{ fontSize:10,fontWeight:700,color:"#64748B",letterSpacing:"0.08em",
              textTransform:"uppercase",marginBottom:10 }}>Thông tin khách</p>
            {/* Guest info rows */}
            <div style={{ border:"1px solid #E2E8F0",borderRadius:10,overflow:"hidden",marginBottom:14 }}>
              {[
                { icon:User,        label:"Khách hàng",     val: room.guestName||"—", vip:room.vipTier },
                { icon:Crown,       label:"Hạng",           val:"", vip:room.vipTier, hideIfNoVip:true },
                { icon:ClipboardList,label:"Mã đặt phòng", val: room.bookingId||"—" },
                { icon:CalendarDays,label:"Chi tiết lưu trú",val:`Nhận phòng: ${room.checkIn||"—"} | Trả phòng: ${room.checkOut||"—"}` },
              ].filter(row => !(row.hideIfNoVip && !room.vipTier))
               .map(({ icon: Icon, label, val, vip },i,arr) => (
                <div key={label}
                  style={{ display:"flex",alignItems:"center",gap:10,padding:"9px 14px",
                    borderBottom:i<arr.length-1?"1px solid #F1F5F9":"none",background:"#FFF" }}>
                  <Icon size={13} style={{ color:"#94A3B8",flexShrink:0 }} />
                  <span style={{ fontSize:12,color:"#64748B",flexShrink:0,width:110 }}>{label}</span>
                  {label==="Hạng" && vip ? <VipBadge tier={vip} />
                    : <span style={{ fontSize:12,fontWeight:label==="Khách hàng"?600:400,color:"#0F172A",flex:1,textAlign:"right" }}>{val}</span>}
                </div>
              ))}
            </div>

            {/* Folio */}
            {invoice && folio && (
              <div style={{ marginBottom:14 }}>
                <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:8 }}>
                  <Receipt size={13} style={{ color:"#64748B" }} />
                  <p style={{ fontSize:10,fontWeight:700,color:"#64748B",letterSpacing:"0.08em",textTransform:"uppercase" }}>Tài khoản lưu trú</p>
                </div>
                <div style={{ border:"1px solid #E2E8F0",borderRadius:10,overflow:"hidden" }}>
                  {(invoice ? [
                    { label: "Tiền phòng", amount: invoice.room_total }, { label: "Dịch vụ / minibar", amount: invoice.service_total },
                    { label: "Phụ thu trả muộn", amount: invoice.late_surcharge }, { label: "Bồi thường", amount: invoice.compensation },
                    { label: "Gia hạn", amount: invoice.extension_total }, { label: "Điều chỉnh", amount: invoice.adjustment_total },
                    { label: "Giảm giá", amount: -invoice.discount },
                  ].filter(item => item.amount !== 0) : room.folioItems ?? []).map((item,i) => (
                    <div key={i} style={{ display:"flex",justifyContent:"space-between",padding:"8px 14px",
                      borderBottom:"1px solid #F8FAFC",background:"#FFF" }}>
                      <span style={{ fontSize:12,color:"#475569" }}>{item.label}</span>
                      <span style={{ fontSize:12,color:"#334155",fontWeight:500 }}>{fmtItem(item,room.folioCurrency)}</span>
                    </div>
                  ))}
                  {/* Total */}
                  <div style={{ display:"flex",justifyContent:"space-between",padding:"10px 14px",
                    background:"#F8FAFC",borderTop:"2px solid #E2E8F0" }}>
                    <span style={{ fontSize:13,fontWeight:700,color:"#0F172A" }}>Tổng hóa đơn</span>
                    <span style={{ fontSize:13,fontWeight:800,color:"#0F172A" }}>{folio?.total}</span>
                  </div>
                  <div style={{ display:"flex",justifyContent:"space-between",padding:"8px 14px",
                    background:"#F8FAFC",borderTop:"1px solid #E2E8F0" }}>
                    <span style={{ fontSize:12,color:"#64748B" }}>Đã thanh toán</span>
                    <span style={{ fontSize:12,color:"#166534",fontWeight:600 }}>{folio?.paid}</span>
                  </div>
                  {/* Balance due */}
                  <div style={{ display:"flex",justifyContent:"space-between",padding:"10px 14px",
                    borderTop:"1px solid #FECDD3",borderRadius:8,background:"#FFF7F7" }}>
                    <span style={{ fontSize:12,color:"#64748B",display:"flex",alignItems:"center",gap:5 }}>
                      <Banknote size={11} /> Còn phải thu
                    </span>
                    <span style={{ fontSize:12,color:"#DC2626",fontWeight:700 }}>
                      {folio?.due}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Operational notes */}
            {room.notes && room.notes.length > 0 && (
              <div>
                <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:8 }}>
                  <ClipboardList size={13} style={{ color:"#64748B" }} />
                  <p style={{ fontSize:10,fontWeight:700,color:"#64748B",letterSpacing:"0.08em",textTransform:"uppercase" }}>Ghi chú vận hành</p>
                </div>
                <ul style={{ listStyle:"none",padding:0,margin:0,display:"flex",flexDirection:"column",gap:5 }}>
                  {room.notes.map((n,i) => (
                    <li key={i} style={{ display:"flex",alignItems:"flex-start",gap:7,fontSize:12,color:"#334155",lineHeight:1.5 }}>
                      <span style={{ color:"#94A3B8",marginTop:2,flexShrink:0 }}>•</span>{n}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
        {tab === "service" && (
          <div>
            <p style={{fontSize:11,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:".08em",marginBottom:4}}>Dịch vụ phát sinh & minibar</p>
            <p style={{fontSize:12,color:"#64748B",lineHeight:1.5,marginBottom:12}}>Chọn dịch vụ khách đã sử dụng để ghi vào tài khoản phòng.</p>
            {room.reservationStatus && room.reservationStatus !== "CHECKED_IN" && (
              <div role="note" style={{padding:"8px 10px",borderRadius:7,background:"#FEF3C7",color:"#92400E",fontSize:11,marginBottom:10}}>
                Lưu ý: Chỉ có thể ghi nhận dịch vụ khi khách đang lưu trú (Đã nhận phòng).
              </div>
            )}
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
              <label htmlFor="front-desk-service" style={{fontSize:11,fontWeight:600,color:"#475569"}}>Dịch vụ khách đã sử dụng</label>
              <select id="front-desk-service" value={serviceId} onChange={event=>setServiceId(event.target.value)} style={{height:38,border:"1px solid #CBD5E1",borderRadius:8,padding:"0 10px",fontSize:12,background:"#FFF",outline:"none",color:"#0F172A"}}>
                <option value="">Chọn dịch vụ cần ghi nhận</option>
                {services.map(service=><option key={service.id} value={service.id} disabled={service.active === false}>{service.name} · {servicePriceLabel(service)} · {serviceAvailabilityLabel(service)}</option>)}
              </select>
              {selectedService && (
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,padding:"10px 12px",borderRadius:8,background:"#F8FAFC",border:"1px solid #E2E8F0"}}>
                  <div>
                    <p style={{fontSize:10,color:"#94A3B8",marginBottom:2}}>Đơn giá áp dụng</p>
                    <p style={{fontSize:12,fontWeight:700,color:"#334155"}}>{servicePriceLabel(selectedService)}</p>
                  </div>
                  <div>
                    <p style={{fontSize:10,color:"#94A3B8",marginBottom:2}}>Khả dụng</p>
                    <p style={{fontSize:12,fontWeight:700,color:selectedService.active !== false ? "#166534" : "#B91C1C"}}>{serviceAvailabilityLabel(selectedService)}</p>
                  </div>
                </div>
              )}
              {serviceId === "MAMREST" && (
                <label htmlFor="front-desk-meal-period" style={{fontSize:11,fontWeight:600,color:"#475569"}}>Bữa ăn
                  <select id="front-desk-meal-period" value={serviceMealPeriod} onChange={event=>setServiceMealPeriod(event.target.value as "LUNCH" | "DINNER")}
                    style={{display:"block",width:"100%",height:38,marginTop:5,border:"1px solid #CBD5E1",borderRadius:8,padding:"0 10px",background:"#FFF"}}>
                    <option value="LUNCH">Bữa trưa</option><option value="DINNER">Bữa tối</option>
                  </select>
                </label>
              )}
              {["BREAKFAST", "LNDRYSTD", "MAMREST", "POOL"].includes(serviceId) && <p style={{fontSize:11,color:"#166534"}}>Hệ thống trừ hạn mức miễn phí của booking theo ngày/phòng; phần vượt tính theo giá niêm yết.</p>}
              <label htmlFor="front-desk-service-quantity" style={{fontSize:11,fontWeight:600,color:"#475569"}}>Số lượng</label>
              <div style={{display:"flex",gap:7}}>
                <input id="front-desk-service-quantity" value={serviceQuantity} onChange={event=>setServiceQuantity(Math.max(1, Number(event.target.value) || 1))} type="number" min="1" step="1" aria-label="Số lượng dịch vụ" style={{flex:1,height:36,border:"1px solid #CBD5E1",borderRadius:8,padding:"0 10px",fontSize:12,outline:"none"}} />
                <button disabled={!canRecordService} onClick={()=>void addService()} style={{height:36,padding:"0 12px",borderRadius:8,border:"none",background:canRecordService?"#16A34A":"#CBD5E1",color:"#FFF",fontSize:11,fontWeight:700,cursor:canRecordService?"pointer":"not-allowed",whiteSpace:"nowrap"}}>{busy==="service"?"Đang ghi nhận…":"Ghi vào hóa đơn"}</button>
              </div>
            </div>
            <p style={{fontSize:12,color:"#64748B",padding:"12px",background:"#F8FAFC",borderRadius:8,lineHeight:1.5}}>Giá niêm yết là giá cho phần phải trả. Quyền lợi miễn phí được áp dụng trước; phần còn lại cộng vào hóa đơn phòng khi checkout.</p>
            {invoice && <p role="note" className="mb-3 text-xs text-amber-800">Phiếu này đã lập hóa đơn: không thể thêm hoặc hủy dịch vụ.</p>}
            {validReservation && <ServiceUsageHistory reservationId={reservationId} refreshKey={reservationDetails?.service_usages?.length} locked={!!invoice} checkingInvoice={!invoiceChecked} onChanged={()=>finishMutation("Đã hủy dịch vụ.")} />}
          </div>
        )}
        {tab==="history" && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <strong style={{ fontSize: 12, color: "#334155" }}>Dòng thời gian sự kiện</strong>
              {timeline.length===0?<p style={{fontSize:12,color:"#94A3B8",padding:"12px 0"}}>Chưa có lịch sử thao tác.</p>:timeline.map(event=><div key={event.id} style={{padding:"8px 0",borderBottom:"1px solid #F1F5F9"}}><strong style={{fontSize:12,color:"#334155"}}>{event.event_type||event.action||"Cập nhật"}</strong><p style={{fontSize:11,color:"#64748B",marginTop:2}}>{fmtDateTime(event.occurred_at||event.created_at)}{event.actor_id?` · ${event.actor_id}`:""}</p>{event.details&&<p style={{fontSize:11,color:"#475569",marginTop:2}}>{event.details}</p>}</div>)}
            </div>

            {payments.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <strong style={{ fontSize: 12, color: "#334155" }}>Lịch sử thanh toán ({payments.length})</strong>
                {payments.map(p => (
                  <div key={p.id} style={{ padding: "6px 0", borderBottom: "1px solid #F1F5F9", fontSize: 11 }}>
                    <span style={{ fontWeight: 600 }}>{fmtVND(p.amount)}</span> · {p.method} · {p.status}
                    <p style={{ color: "#94A3B8", fontSize: 10 }}>{fmtDateTime(p.occurred_at)} · {p.actor_id}</p>
                  </div>
                ))}
              </div>
            )}

            {receipts.length > 0 && (
              <div>
                <strong style={{ fontSize: 12, color: "#334155" }}>Biên lai đã phát hành ({receipts.length})</strong>
                {receipts.map(rc => (
                  <div key={rc.id} style={{ padding: "6px 0", borderBottom: "1px solid #F1F5F9", fontSize: 11, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontWeight: 600 }}>{rc.receipt_number}</span> · {fmtVND(rc.amount)}
                      <p style={{ color: "#94A3B8", fontSize: 10 }}>{fmtDateTime(rc.issued_at)} · {rc.issued_by}</p>
                    </div>
                    {invoice && <button onClick={() => printReceipt(rc, room, invoice, rooms.filter(candidate => candidate.reservationId === reservationId), services, reservationDetails)} style={{ fontSize: 10, color: "#2563EB", fontWeight: 600 }}>In lại</button>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {tab==="notes" && (
          <div>
            <p style={{fontSize:11,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:".08em",marginBottom:10}}>Ghi chú vận hành</p>
            {room.notes && room.notes.length > 0 ? (
              <ul style={{ listStyle:"none",padding:0,margin:0,display:"flex",flexDirection:"column",gap:8 }}>
                {room.notes.map((n,i) => (
                  <li key={i} style={{ display:"flex",alignItems:"flex-start",gap:8,padding:"10px 12px",background:"#F8FAFC",borderRadius:8,fontSize:12,color:"#334155",border:"1px solid #E2E8F0",lineHeight:1.5 }}>
                    <ClipboardList size={14} style={{ color:"#3B82F6",marginTop:2,flexShrink:0 }} />
                    <span>{n}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{ textAlign:"center",padding:"40px 20px",color:"#94A3B8" }}>
                <ClipboardList size={28} style={{ margin:"0 auto 10px",opacity:.3 }} />
                <p style={{ fontSize:13,fontWeight:500 }}>Chưa có ghi chú vận hành cho phòng này.</p>
              </div>
            )}
          </div>
        )}
        {feedback && <div role={feedback.tone==="error"?"alert":"status"} style={{marginTop:12,padding:"10px 12px",borderRadius:8,fontSize:12,lineHeight:1.5,background:feedback.tone==="error"?"#FFF1F2":feedback.tone==="success"?"#F0FDF4":"#EFF6FF",color:feedback.tone==="error"?"#BE123C":feedback.tone==="success"?"#166534":"#1D4ED8"}}>{feedback.text}</div>}

        {operation==="cancel" && (
          <div style={{marginTop:12,padding:12,border:"1px solid #FECDD3",borderRadius:10,background:"#FFF1F2"}}>
            <strong style={{fontSize:12,color:"#BE123C"}}>Hủy đặt phòng</strong>
            <input value={cancelReason} onChange={e=>setCancelReason(e.target.value)} placeholder="Lý do hủy đặt phòng (bắt buộc)..." style={{width:"100%",height:34,marginTop:8,border:"1px solid #CBD5E1",borderRadius:7,padding:"0 9px",boxSizing:"border-box"}} />
            <button onClick={()=>void cancelReservation()} disabled={!cancelReason.trim()||busy!==null} style={{marginTop:8,width:"100%",height:34,borderRadius:7,background:"#DC2626",color:"#FFF",fontWeight:700,cursor:cancelReason.trim()?"pointer":"not-allowed"}}>
              {busy==="cancel"?"Đang hủy…":"Xác nhận hủy đặt phòng"}
            </button>
          </div>
        )}

        {checkoutStep!=="idle" && invoice && <div style={{marginTop:12,padding:13,border:"1px solid #BBF7D0",borderRadius:10,background:"#F0FDF4"}}><p style={{fontSize:10,fontWeight:800,color:"#166534",letterSpacing:1}}>QUY TRÌNH TRẢ PHÒNG</p><p style={{fontSize:12,color:"#334155",marginTop:6}}>Hóa đơn #{invoice.id} · Còn thanh toán <strong>{fmtVND(invoice.payable)}</strong></p>{checkoutStep==="done"&&<div style={{marginTop:9,fontSize:12,fontWeight:700,color:"#166534"}}>{issuedReceipt?`Hoàn tất · ${issuedReceipt.receipt_number}`:"Hoàn tất · không phát sinh số tiền phải thu"}{issuedReceipt&&<button onClick={()=>printReceipt(issuedReceipt,room,invoice,rooms.filter(candidate=>candidate.reservationId===reservationId),services,reservationDetails)} style={{display:"block",marginTop:7,color:"#1D4ED8",fontWeight:700}}>In lại biên lai</button>}</div>}</div>}
      </div>

      {/* Action buttons */}
      <div className="frontdesk-room-drawer__actions" style={{ borderTop:"1px solid #E2E8F0",flexShrink:0 }}>
        <div className="frontdesk-room-drawer__workflow">
          {onCreateBooking && room.occStatus === "vacant" && room.cleanStatus === "clean" && (
            <button type="button" className="frontdesk-room-drawer__workflow-button frontdesk-room-drawer__workflow-button--wide" onClick={()=>onCreateBooking(room)}
              style={{ background:"#16A34A",color:"#FFF",cursor:"pointer" }}>
              <PlusCircle size={14} /> Đặt phòng này
            </button>
          )}
          {canCheckIn && (
            <button className="frontdesk-room-drawer__workflow-button frontdesk-room-drawer__workflow-button--wide" onClick={()=>void handleCheckInAction()} disabled={busy!==null}
              style={{ background:"#2563EB",color:"#FFF",cursor:busy===null?"pointer":"not-allowed" }}>
              <CheckCircle2 size={14} /> {busy==="checkin"?"Đang nhận phòng…":"Nhận phòng (Check-in)"}
            </button>
          )}
          {validReservation && room.reservationStatus === "CHECKED_IN" && checkoutStep === "idle" && <label style={{display:"grid",gap:4,fontSize:11,color:"#475569"}}>Phương thức thanh toán
            <select aria-label="Phương thức thanh toán khi trả phòng" value={paymentMethod} onChange={event=>setPaymentMethod(event.target.value as PaymentMethod)} style={{height:34,border:"1px solid #CBD5E1",borderRadius:7,padding:"0 8px",background:"#FFF"}}><option value="CASH">Tiền mặt</option><option value="CARD">Thẻ</option><option value="BANK_TRANSFER">Chuyển khoản</option></select>
          </label>}
          {validReservation && isCheckedIn && checkoutStep === "idle" && (
            <button className="frontdesk-room-drawer__workflow-button frontdesk-room-drawer__workflow-button--wide" onClick={()=>void reviewCheckout()}
              disabled={busy!==null}
              style={{ background:"#16A34A",color:"#FFF",cursor:busy===null?"pointer":"not-allowed" }}>
              <CheckCircle2 size={14} /> {busy==="review"?"Đang hoàn tất…":"Trả phòng, thanh toán & biên lai"}
            </button>
          )}
        </div>
        {validReservation && isCheckedIn && checkoutStep === "idle" && (
          <button className="frontdesk-room-drawer__secondary-action" onClick={()=>setTab("service")} disabled={busy!==null || !invoiceChecked || !!invoice} title={invoice ? "Đã lập hóa đơn: không thể thêm dịch vụ" : "Mở mục dịch vụ để chọn và ghi nhận"}>
            <PlusCircle size={13} /> Thêm dịch vụ
          </button>
        )}
        <div role="note" style={{padding:"9px 10px",borderRadius:8,background:"#F8FAFC",border:"1px solid #E2E8F0",color:"#64748B",fontSize:11,lineHeight:1.5}}>
          Trạng thái phòng được cập nhật theo quy trình nhận/trả phòng. Dọn phòng và bảo trì do bộ phận chuyên trách xử lý để không bỏ qua checklist hoặc nghiệm thu.
        </div>
        {canCancel && (
          <div style={{ display:"flex",gap:8,marginTop:2 }}>
            <button onClick={()=>setOperation(v=>v==="cancel"?null:"cancel")} disabled={busy!==null} style={{ flex:1,padding:"6px 8px",borderRadius:8,
              background:"#FFF",border:"1px solid #FECDD3",color:"#BE123C",fontSize:10,fontWeight:600,cursor:"pointer" }}>
              Hủy đặt phòng
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SHARED KPI BAR (reused across screens)
══════════════════════════════════════════════════════════ */
function KpiBar({ rooms, arrivals, departures }: { rooms: Room[]; arrivals: number; departures: number }) {
  const occupied = rooms.filter(room=>room.occStatus==="occupied"||room.occStatus==="dnd").length;
  const reserved = rooms.filter(room=>room.occStatus==="reserved").length;
  const ready = rooms.filter(room=>room.operationalStatus==="available").length;
  const cleaning = rooms.filter(room=>room.operationalStatus==="cleaning").length;
  const occupancy = rooms.length ? Math.round(occupied * 100 / rooms.length) : 0;
  return (
    <div style={{ background:"#FFF",borderBottom:"1px solid #E2E8F0",
      display:"flex",gap:0,flexShrink:0,padding:"0 20px" }}>
      {[
        { label:"Khách đến", val:String(arrivals),sub:"Booking đến hôm nay",trend:"",iconBg:"#DCFCE7",iconColor:"#16A34A",Icon:Users },
        { label:"Khách trả phòng",val:String(departures),sub:"Booking trả hôm nay",trend:"",iconBg:"#DBEAFE",iconColor:"#3B82F6",Icon:ArrowUpRight },
        { label:"Công suất", val:`${occupancy}%`,sub:`${occupied} / ${rooms.length} phòng có khách`,trend:"",iconBg:"#EDE9FE",iconColor:"#7C3AED",Icon:BedDouble },
        { label:"Phòng sẵn sàng",val:`Sẵn sàng: ${ready}`,sub:`Đã giữ: ${reserved} · Đang dọn: ${cleaning}`,trend:"",iconBg:"#DCFCE7",iconColor:"#16A34A",Icon:CheckCircle2 },
      ].map((k,i,arr) => (
        <div key={k.label} style={{ flex:1,padding:"16px 0",display:"flex",alignItems:"center",gap:14,
          borderRight:i<arr.length-1?"1px solid #F1F5F9":"none",
          paddingRight:i<arr.length-1?20:0,paddingLeft:i>0?20:0 }}>
          <div style={{ width:44,height:44,borderRadius:12,background:k.iconBg,flexShrink:0,
            display:"flex",alignItems:"center",justifyContent:"center" }}>
            <k.Icon size={18} style={{ color:k.iconColor }} />
          </div>
          <div>
            <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:2 }}>
              <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:26,fontWeight:800,color:"#0F172A",lineHeight:1 }}>{k.val}</span>
              {k.trend && (
                <span style={{ fontSize:11,fontWeight:600,color:"#16A34A",background:"#DCFCE7",
                  padding:"1px 6px",borderRadius:99,display:"flex",alignItems:"center",gap:2 }}>
                  <ArrowUpRight size={10} /> {k.trend}
                </span>
              )}
            </div>
            <p style={{ fontSize:11,fontWeight:500,color:"#64748B" }}>{k.label}</p>
            <p style={{ fontSize:11,color:"#94A3B8",marginTop:1 }}>{k.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   OVERVIEW SCREEN
══════════════════════════════════════════════════════════ */
function OverviewScreen({ arrivals, departures, alerts = [], activities = [], dataState, dataError, onRetry, onOpenRoom, actorName }: { arrivals: OverviewArrival[]; departures: DepartureGuest[]; alerts?: LiveAlert[]; activities?: LiveActivity[]; dataState: "loading" | "live" | "fallback"; dataError: string | null; onRetry: () => void; onOpenRoom: (roomId: string) => void; actorName: string }) {
  const [tick, setTick] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setTick(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  const now = new Date(tick);
  const timeStr = now.toLocaleTimeString("vi-VN", { hour:"2-digit",minute:"2-digit" });
  const dateStr = now.toLocaleDateString("vi-VN", { weekday:"long",day:"numeric",month:"long",year:"numeric" });
  const hour = now.getHours();
  const greet = hour < 12 ? "buổi sáng" : hour < 18 ? "buổi chiều" : "buổi tối";

  return (
    <div style={{ flex:1,overflowY:"auto",background:"#F8FAFC" }}>
      {/* Welcome bar */}
      <div style={{ padding:"18px 24px 14px",borderBottom:"1px solid #E2E8F0",background:"#FFF" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div>
            <p style={{ fontSize:18,fontWeight:700,color:"#0F172A" }}>
              Chào {greet}, {actorName || "nhân viên lễ tân"} ☀️
            </p>
            <p style={{ fontSize:12,color:"#64748B",marginTop:3 }}>
              {dateStr} — Ca làm: <strong>07:00 – 15:00</strong> | Bàn FD-02
            </p>
          </div>
          <div style={{ textAlign:"right" }}>
            <p style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:28,fontWeight:800,color:"#0F172A",lineHeight:1 }}>{timeStr}</p>
            <p style={{ fontSize:11,color:"#94A3B8",marginTop:2 }}>Giờ hiện tại</p>
          </div>
        </div>
      </div>

      <div style={{ padding:20,display:"flex",flexDirection:"column",gap:16 }}>
        <div role={dataState==="fallback"?"alert":"status"} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,padding:"9px 12px",borderRadius:9,background:dataState==="live"?"#F0FDF4":dataState==="loading"?"#EFF6FF":"#FFFBEB",border:`1px solid ${dataState==="live"?"#BBF7D0":dataState==="loading"?"#BFDBFE":"#FDE68A"}`,fontSize:12,color:"#334155"}}><span>{dataState==="live"?"● Dữ liệu đang được cập nhật":dataState==="loading"?"Đang cập nhật thông tin vận hành…":`Không tải được thông tin vận hành. ${dataError??""}`}</span>{dataState==="fallback"&&<button onClick={onRetry} style={{fontWeight:700,color:"#1D4ED8",whiteSpace:"nowrap"}}>Thử lại</button>}</div>
        {/* Alerts */}
        <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
          {alerts.length === 0 ? (
            <div style={{ display:"flex",alignItems:"center",gap:8,padding:"10px 14px",borderRadius:10,background:"#F0FDF4",border:"1px solid #BBF7D0",fontSize:12,color:"#166534" }}>
              <CheckCircle2 size={14} style={{ color:"#16A34A" }} />
              <span>Không có sự cố</span>
            </div>
          ) : (
            alerts.map(a => {
              const cfg = { error:{bg:"#FFF1F2",border:"#FECDD3",icon:"#E11D48",dot:"#F43F5E"},
                warning:{bg:"#FFFBEB",border:"#FDE68A",icon:"#D97706",dot:"#F59E0B"},
                info:{bg:"#EFF6FF",border:"#BFDBFE",icon:"#2563EB",dot:"#3B82F6"},
                success:{bg:"#F0FDF4",border:"#BBF7D0",icon:"#16A34A",dot:"#22C55E"} }[a.type] || {bg:"#F8FAFC",border:"#E2E8F0",icon:"#94A3B8",dot:"#94A3B8"};
              const Icon = a.type==="error"?XCircle:a.type==="success"?CheckCircle2:a.type==="warning"?AlertCircle:Bell;
              return (
                <div key={a.id} style={{ display:"flex",alignItems:"flex-start",gap:10,padding:"10px 14px",
                  borderRadius:10,background:cfg.bg,border:`1px solid ${cfg.border}` }}>
                  <Icon size={14} style={{ color:cfg.icon,flexShrink:0,marginTop:1 }} />
                  <p style={{ fontSize:12,color:"#334155",flex:1,lineHeight:1.5 }}>{a.msg}</p>
                  <span style={{ fontSize:11,color:"#94A3B8",flexShrink:0,whiteSpace:"nowrap" }}>{a.time}</span>
                </div>
              );
            })
          )}
        </div>

        {/* Two-column content */}
        <div style={{ display:"flex",gap:16 }}>
          {/* Left: Arrivals + Departures */}
          <div style={{ flex:1,display:"flex",flexDirection:"column",gap:16,minWidth:0 }}>
            {/* Arrivals */}
            <div style={{ background:"#FFF",borderRadius:12,border:"1px solid #E2E8F0",overflow:"hidden" }}>
              <div style={{ padding:"14px 16px",borderBottom:"1px solid #F1F5F9",
                display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                  <div style={{ width:28,height:28,borderRadius:8,background:"#DCFCE7",
                    display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <ArrowUpLeft size={14} style={{ color:"#16A34A" }} />
                  </div>
                  <div>
                    <p style={{ fontSize:13,fontWeight:700,color:"#0F172A" }}>Khách đến hôm nay</p>
                    <p style={{ fontSize:11,color:"#94A3B8" }}>Khách đến — {arrivals.length} đặt phòng</p>
                  </div>
                </div>
              </div>
              <table style={{ width:"100%",borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ background:"#F8FAFC" }}>
                    {["Khách hàng","Phòng","Loại phòng","Mã đặt phòng","Giờ đến","Trạng thái",""].map(h => (
                      <th key={h} style={{ padding:"8px 14px",fontSize:11,fontWeight:600,color:"#64748B",
                        textAlign:"left",whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {arrivals.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding:"24px 14px",textAlign:"center",fontSize:12,color:"#94A3B8" }}>
                        Hôm nay không có khách đến
                      </td>
                    </tr>
                  ) : (
                    arrivals.map((g,i) => (
                      <tr key={g.id} style={{ borderTop:"1px solid #F1F5F9",
                        background:i%2===0?"#FFF":"#FAFAFA" }}>
                        <td style={{ padding:"10px 14px" }}>
                          <div style={{ display:"flex",alignItems:"center",gap:7 }}>
                            <div style={{ width:26,height:26,borderRadius:99,
                              background:"linear-gradient(135deg,#6366F1,#8B5CF6)",
                              display:"flex",alignItems:"center",justifyContent:"center",
                              fontSize:10,fontWeight:700,color:"#FFF",flexShrink:0 }}>
                              {g.name.split(" ").pop()?.charAt(0)}
                            </div>
                            <div>
                              <p style={{ fontSize:12,fontWeight:600,color:"#0F172A" }}>{g.name}</p>
                              {g.vip && <VipBadge tier={g.vip as VipTier} />}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding:"10px 14px",fontSize:13,fontWeight:700,color:"#0F172A" }}>{g.room}</td>
                        <td style={{ padding:"10px 14px",fontSize:12,color:"#64748B" }}>{roomTypeLabel(g.type)}</td>
                        <td style={{ padding:"10px 14px",fontSize:12,color:"#64748B",fontFamily:"'JetBrains Mono',monospace" }}>{g.booking}</td>
                        <td style={{ padding:"10px 14px" }}>
                          <div style={{ display:"flex",alignItems:"center",gap:4 }}>
                            <Clock size={11} style={{ color:"#94A3B8" }} />
                            <span style={{ fontSize:12,fontWeight:600,color:"#0F172A" }}>{g.eta}</span>
                          </div>
                        </td>
                        <td style={{ padding:"10px 14px" }}>
                          <span style={{ fontSize:11,fontWeight:500,padding:"2px 8px",borderRadius:99,
                            background:g.status==="early"?"#FEF9C3":"#DBEAFE",
                            color:g.status==="early"?"#92400E":"#1D4ED8" }}>
                            {g.status==="early"?"Đến sớm · chờ giờ nhận":"Chờ nhận phòng"}
                          </span>
                        </td>
                        <td style={{ padding:"10px 14px" }}>
                          <button onClick={()=>onOpenRoom(g.room)} style={{ fontSize:11,fontWeight:600,color:"#16A34A",cursor:"pointer" }}>
                            Xem phòng
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Departures */}
            <div style={{ background:"#FFF",borderRadius:12,border:"1px solid #E2E8F0",overflow:"hidden" }}>
              <div style={{ padding:"14px 16px",borderBottom:"1px solid #F1F5F9",
                display:"flex",alignItems:"center",gap:8 }}>
                <div style={{ width:28,height:28,borderRadius:8,background:"#FEF3C7",
                  display:"flex",alignItems:"center",justifyContent:"center" }}>
                  <ArrowDownLeft size={14} style={{ color:"#D97706" }} />
                </div>
                <div>
                  <p style={{ fontSize:13,fontWeight:700,color:"#0F172A" }}>Khách trả phòng hôm nay</p>
                  <p style={{ fontSize:11,color:"#94A3B8" }}>Khách trả phòng — {departures.length} phòng</p>
                </div>
              </div>
              <table style={{ width:"100%",borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ background:"#F8FAFC" }}>
                    {["Khách hàng","Phòng","Loại phòng","Folio","Trạng thái",""].map(h => (
                      <th key={h} style={{ padding:"8px 14px",fontSize:11,fontWeight:600,color:"#64748B",textAlign:"left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {departures.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding:"24px 14px",textAlign:"center",fontSize:12,color:"#94A3B8" }}>
                        Hôm nay không có khách trả phòng
                      </td>
                    </tr>
                  ) : (
                    departures.map((g,i) => (
                      <tr key={g.id} style={{ borderTop:"1px solid #F1F5F9",background:i%2===0?"#FFF":"#FAFAFA" }}>
                        <td style={{ padding:"10px 14px" }}>
                          <div style={{ display:"flex",alignItems:"center",gap:7 }}>
                            <div style={{ width:26,height:26,borderRadius:99,
                              background:"#F1F5F9",
                              display:"flex",alignItems:"center",justifyContent:"center",
                              fontSize:10,fontWeight:700,color:"#64748B",flexShrink:0 }}>
                              {g.name.split(" ").pop()?.charAt(0)}
                            </div>
                            <span style={{ fontSize:12,fontWeight:600,color:"#0F172A" }}>{g.name}</span>
                          </div>
                        </td>
                        <td style={{ padding:"10px 14px",fontSize:13,fontWeight:700,color:"#0F172A" }}>{g.room}</td>
                        <td style={{ padding:"10px 14px",fontSize:12,color:"#64748B" }}>{roomTypeLabel(g.type)}</td>
                        <td style={{ padding:"10px 14px" }}>
                          <span style={{ fontSize:11,fontWeight:500,padding:"2px 8px",borderRadius:99,
                            background:g.balanceOk?"#F0FDF4":"#FFF1F2",
                            color:g.balanceOk?"#166534":"#BE123C" }}>
                            {g.balanceOk?"Đã thanh toán":"Cần thanh toán"}
                          </span>
                        </td>
                        <td style={{ padding:"10px 14px" }}>
                          <span style={{ fontSize:11,fontWeight:500,padding:"2px 8px",borderRadius:99,
                            background:g.status==="overdue"?"#FFF1F2":g.status==="dnd"?"#FFE4E6":"#F0FDF4",
                            color:g.status==="overdue"?"#BE123C":g.status==="dnd"?"#BE123C":"#166534" }}>
                            {g.status==="overdue"?"Quá giờ":g.status==="dnd"?"Không làm phiền":"Chờ trả phòng"}
                          </span>
                        </td>
                        <td style={{ padding:"10px 14px" }}>
                          <button onClick={()=>onOpenRoom(g.room)} style={{ fontSize:11,fontWeight:600,color:"#2563EB",cursor:"pointer" }}>
                            Xử lý
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Activity feed */}
          <div style={{ width:280,flexShrink:0 }}>
            <div style={{ background:"#FFF",borderRadius:12,border:"1px solid #E2E8F0",overflow:"hidden" }}>
              <div style={{ padding:"14px 16px",borderBottom:"1px solid #F1F5F9" }}>
                <p style={{ fontSize:13,fontWeight:700,color:"#0F172A" }}>Hoạt động gần đây</p>
              </div>
              <div style={{ padding:"8px 0" }}>
                {activities.length === 0 ? (
                  <div style={{ padding:"20px 16px",textAlign:"center",fontSize:12,color:"#94A3B8" }}>
                    Chưa có hoạt động nào trong ngày
                  </div>
                ) : (
                  activities.map((a,i) => (
                    <div key={a.id} style={{ display:"flex",alignItems:"flex-start",gap:10,
                      padding:"10px 16px",borderBottom:i<activities.length-1?"1px solid #F8FAFC":"none" }}>
                      <span style={{ width:26,height:26,borderRadius:99,background:"#F1F5F9",
                        display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1 }}>
                        <Clock size={11} style={{ color:"#94A3B8" }} />
                      </span>
                      <div>
                        <p style={{ fontSize:12,color:"#334155",lineHeight:1.5 }}>{a.msg}</p>
                        <p style={{ fontSize:11,color:"#94A3B8",marginTop:2 }}>{a.time}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ROOM MAP SCREEN
══════════════════════════════════════════════════════════ */
function RoomMapScreen({ rooms = [], dataState, focusRoomId, onRefresh, onCheckIn, onCreateBooking }: { rooms?: Room[]; dataState: "loading" | "live" | "fallback"; focusRoomId?: string | null; onRefresh: () => Promise<void> | void; onCheckIn?: (resId: number) => Promise<void>; onCreateBooking: (room?: Room) => void }) {
  const [selectedRoom, setSelectedRoom] = useState<Room|null>(null);
  const settlementActive = useRef(false);
  const selectRoom = (next: Room | null) => { settlementActive.current = false; setSelectedRoom(next); };
  const [filter, setFilter]     = useState("all");
  const [search, setSearch]     = useState("");
  const [viewMode, setViewMode] = useState<"grid"|"list">("grid");
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Keep the checked-out booking available for collecting payment and issuing its receipt.
    if (settlementActive.current) return;
    if (focusRoomId) {
      const focused = rooms.find(room => room.id === focusRoomId);
      if (focused) { setSelectedRoom(focused); return; }
    }
    if (!hasInitialized.current && rooms.length > 0) {
      hasInitialized.current = true;
      setSelectedRoom(rooms.find(room => room.id === "203") ?? rooms[0] ?? null);
    } else if (selectedRoom) {
      const current = rooms.find(room => room.id === selectedRoom.id);
      if (current && current !== selectedRoom) setSelectedRoom(current);
    }
  }, [focusRoomId, rooms]);

  const cnt = useMemo(()=>({
    all:      rooms.length,
    vacant:   rooms.filter(r=>r.occStatus==="vacant"&&r.cleanStatus==="clean").length,
    reserved: rooms.filter(r=>r.occStatus==="reserved").length,
    occupied: rooms.filter(r=>r.occStatus==="occupied"||r.occStatus==="dnd").length,
    cleaning: rooms.filter(r=>r.cleanStatus==="cleaning"||(r.occStatus==="vacant"&&r.cleanStatus==="dirty")).length,
    locked:   rooms.filter(r=>r.occStatus==="ood").length,
  }),[rooms]);

  const filtered = useMemo(()=>{
    let rs = rooms;
    if (filter==="vacant")        rs=rs.filter(r=>r.occStatus==="vacant"&&r.cleanStatus==="clean");
    else if (filter==="reserved") rs=rs.filter(r=>r.occStatus==="reserved");
    else if (filter==="occupied") rs=rs.filter(r=>r.occStatus==="occupied"||r.occStatus==="dnd");
    else if (filter==="cleaning") rs=rs.filter(r=>r.cleanStatus==="cleaning"||(r.occStatus==="vacant"&&r.cleanStatus==="dirty"));
    else if (filter==="locked")   rs=rs.filter(r=>r.occStatus==="ood");
    if (search.trim()) {
      const q=search.toLowerCase();
      rs=rs.filter(r=>r.number.includes(q)||r.guestName?.toLowerCase().includes(q)||r.bookingId?.toLowerCase().includes(q));
    }
    return rs;
  },[filter,search,rooms]);

  const floors = useMemo(()=>{
    const m = new Map<number,Room[]>();
    filtered.forEach(r=>{ if(!m.has(r.floor)) m.set(r.floor,[]); m.get(r.floor)!.push(r); });
    return Array.from(m.entries()).sort((a,b)=>a[0]-b[0]);
  },[filtered]);

  const toggleFloor = (f:number)=>setCollapsed(p=>{ const s=new Set(p); s.has(f)?s.delete(f):s.add(f); return s; });

  const FILTER_TABS = [
    {id:"all",label:`Tất cả (${cnt.all})`},
    {id:"vacant",label:`Chưa có khách (${cnt.vacant})`},
    {id:"reserved",label:`Đã giữ phòng (${cnt.reserved})`},
    {id:"occupied",label:`Có khách (${cnt.occupied})`},
    {id:"cleaning",label:`Đang dọn (${cnt.cleaning})`},
    {id:"locked",label:`Khóa (${cnt.locked})`},
  ];

  return (
    <div className="frontdesk-room-map" style={{ flex:1,display:"flex",overflow:"hidden",minHeight:0 }}>
      <div style={{ flex:1,overflowY:"auto",minWidth:0 }}>
        {/* Section title + filter */}
        <div style={{ padding:"20px 20px 0" }}>
          <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,marginBottom:14 }}>
            <div>
              <h2 style={{ fontSize:18,fontWeight:700,color:"#0F172A",marginBottom:2 }}>Sơ đồ phòng</h2>
              <p style={{ fontSize:12,color:"#94A3B8" }}>Cập nhật trạng thái theo thời gian thực</p>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",justifyContent:"flex-end" }}>
              <button type="button" onClick={()=>onCreateBooking()} style={{ height:34,padding:"0 12px",borderRadius:8,
                background:"#16A34A",color:"#FFF",fontSize:12,fontWeight:700,cursor:"pointer",
                display:"flex",alignItems:"center",gap:6,whiteSpace:"nowrap" }}>
                <PlusCircle size={14} /> Tạo đặt phòng
              </button>
              <div style={{ display:"flex",gap:2,border:"1px solid #E2E8F0",borderRadius:8,overflow:"hidden" }}>
                {([{m:"grid" as const,I:LayoutGrid},{m:"list" as const,I:List}]).map(({m,I})=>(
                  <button key={m} onClick={()=>setViewMode(m)} aria-label={m === "grid" ? "Xem dạng thẻ" : "Xem dạng danh sách"}
                    style={{ padding:"6px 10px",cursor:"pointer",display:"flex",alignItems:"center",
                      background:viewMode===m?"#F1F5F9":"#FFF",color:viewMode===m?"#0F172A":"#94A3B8" }}>
                    <I size={14} />
                  </button>
                ))}
              </div>
            </div>
          </div>
          {/* Search + filters */}
          <div style={{ position:"relative",marginBottom:12 }}>
            <Search size={13} style={{ position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#94A3B8",pointerEvents:"none" }} />
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Tìm số phòng, tên khách, mã booking..."
              style={{ width:"100%",height:34,paddingLeft:30,paddingRight:12,borderRadius:8,
                border:"1px solid #E2E8F0",background:"#F8FAFC",fontSize:12,color:"#0F172A",outline:"none",boxSizing:"border-box" }} />
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:16 }}>
            {FILTER_TABS.map(t=>{
              const active=filter===t.id;
              return (
                <button key={t.id} onClick={()=>setFilter(t.id)}
                  style={{ padding:"6px 14px",borderRadius:99,cursor:"pointer",fontSize:12,fontWeight:active?600:400,
                    background:active?"#1E293B":"#FFF",color:active?"#FFF":"#475569",
                    border:`1px solid ${active?"#1E293B":"#E2E8F0"}`,transition:"all .1s" }}>
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Room grid or list */}
        <div style={{ padding:"0 20px 20px" }}>
          {rooms.length === 0 && dataState === "live" ? (
            <div style={{ textAlign:"center",padding:"48px 0",color:"#94A3B8" }}>
              <BedDouble size={32} style={{ margin:"0 auto 10px",opacity:.3 }} />
              <p style={{ fontSize:13 }}>Chưa có dữ liệu phòng từ hệ thống</p>
            </div>
          ) : rooms.length > 0 && floors.length===0 ? (
            <div style={{ textAlign:"center",padding:"48px 0",color:"#94A3B8" }}>
              <Search size={28} style={{ margin:"0 auto 10px",opacity:.3 }} />
              <p style={{ fontSize:13 }}>Không tìm thấy phòng phù hợp</p>
            </div>
          ) : null}
          {floors.map(([floor,fRooms])=>{
            const isCol = collapsed.has(floor);
            const total = rooms.filter(r=>r.floor===floor).length;
            return (
              <div key={floor} style={{ marginBottom:20 }}>
                <button onClick={()=>toggleFloor(floor)}
                  style={{ display:"flex",alignItems:"center",gap:8,marginBottom:12,cursor:"pointer",width:"100%" }}>
                  {isCol?<ChevronRight size={15} style={{ color:"#94A3B8" }} />:<ChevronDown size={15} style={{ color:"#94A3B8" }} />}
                  <span style={{ fontSize:13,fontWeight:600,color:"#334155" }}>Tầng {floor}</span>
                  <span style={{ fontSize:12,color:"#94A3B8" }}>Tầng {floor} • {total} phòng</span>
                </button>
                {!isCol && (
                  viewMode === "grid" ? (
                    <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(185px,1fr))",gap:10 }}>
                      {fRooms.map(room=>(
                        <RoomCard key={room.id} room={room}
                          selected={selectedRoom?.id===room.id}
                          onClick={()=>selectRoom(selectedRoom?.id===room.id?null:room)} />
                      ))}
                    </div>
                  ) : (
                    <div style={{ background:"#FFF",borderRadius:10,border:"1px solid #E2E8F0",overflow:"hidden" }}>
                      <table style={{ width:"100%",borderCollapse:"collapse" }}>
                        <thead>
                          <tr style={{ background:"#F8FAFC" }}>
                            {["Số phòng","Loại phòng","Giường","Trạng thái ở","Vệ sinh","Khách lưu trú",""].map(h=>(
                              <th key={h} style={{ padding:"8px 12px",fontSize:11,fontWeight:600,color:"#64748B",textAlign:"left" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {fRooms.map((room, idx)=>(
                            <tr key={room.id} onClick={()=>selectRoom(room)} style={{ borderTop:"1px solid #F1F5F9",background:selectedRoom?.id===room.id?"#EFF6FF":idx%2===0?"#FFF":"#FAFAFA",cursor:"pointer" }}>
                              <td style={{ padding:"10px 12px",fontSize:14,fontWeight:700,color:"#0F172A" }}>{room.number}</td>
                              <td style={{ padding:"10px 12px",fontSize:12,color:"#475569" }}>{roomTypeLabel(room.type)}</td>
                              <td style={{ padding:"10px 12px",fontSize:11,color:"#64748B" }}>{bedLabel(room.beds)}</td>
                              <td style={{ padding:"10px 12px" }}><OccBadge s={room.occStatus} /></td>
                              <td style={{ padding:"10px 12px" }}><ClnBadge s={room.cleanStatus} /></td>
                              <td style={{ padding:"10px 12px",fontSize:12,color:"#334155" }}>
                                {room.guestName ? <span><strong>{room.guestName}</strong> <span style={{fontSize:10,color:"#94A3B8"}}>({room.bookingId || "—"})</span></span> : <span style={{color:"#94A3B8"}}>—</span>}
                              </td>
                              <td style={{ padding:"10px 12px",textAlign:"right" }}>
                                <button onClick={(e)=>{ e.stopPropagation(); selectRoom(room); }} style={{ fontSize:11,fontWeight:600,color:"#2563EB",cursor:"pointer",padding:"4px 8px",borderRadius:6,background:"#F0FDF4",border:"1px solid #BBF7D0" }}>
                                  Chi tiết
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      </div>
      {selectedRoom && <RoomDrawer room={selectedRoom} rooms={rooms} onClose={()=>selectRoom(null)} onRefresh={onRefresh} onCheckIn={onCheckIn} onSettlementChange={active=>{ settlementActive.current = active; }} onCreateBooking={onCreateBooking} />}
    </div>
  );
}

import { CreateBookingModal } from "./CreateBookingModal";
/* ══════════════════════════════════════════════════════════
   GUESTS SCREEN
══════════════════════════════════════════════════════════ */
function GuestsScreen({ staying = [], arriving = [], departures = [], onCheckIn, onOpenRoom, onRefresh, onCreateBooking }: { staying?: Room[]; arriving?: ArrivingGuest[]; departures?: DepartureGuest[]; onCheckIn: (guest: ArrivingGuest) => Promise<void>; onOpenRoom: (roomId: string) => void; onRefresh?: () => Promise<void> | void; onCreateBooking: () => void }) {
  const [gTab, setGTab] = useState<"staying"|"arriving"|"departed"|"directory">("staying");
  const [gSearch, setGSearch] = useState("");
  const [vipOnly, setVipOnly] = useState(false);
  const [checkedIn, setCheckedIn] = useState<string[]>([]);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Directory / Guest lookup state
  const [directoryGuests, setDirectoryGuests] = useState<Guest[]>([]);
  const [directoryLoading, setDirectoryLoading] = useState(false);

  // Modals
  const [showCreateGuest, setShowCreateGuest] = useState(false);
  const [submittingModal, setSubmittingModal] = useState(false);

  // Form states for Create Guest
  const [guestFullName, setGuestFullName] = useState("");
  const [guestIdNumber, setGuestIdNumber] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");

  const GTABS = [
    { id: "staying",   label: `Đang lưu trú (${staying.length})` },
    { id: "arriving",  label: `Sắp đến (${arriving.length})` },
    { id: "departed",  label: `Trả phòng (${departures.length})` },
    { id: "directory", label: "Tra cứu khách hàng" },
  ] as const;

  const loadDirectory = useCallback(async (query = "") => {
    setDirectoryLoading(true);
    try {
      const results = await frontDeskApi.guests(query.trim() || undefined);
      setDirectoryGuests(results);
    } catch (err) {
      setActionError(apiErrorText(err));
    } finally {
      setDirectoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (gTab === "directory") {
      void loadDirectory(gSearch);
    }
  }, [gTab, gSearch, loadDirectory]);

  const stayingFiltered = staying.filter(r => {
    const matchesSearch = !gSearch || r.guestName?.toLowerCase().includes(gSearch.toLowerCase()) ||
      r.number.includes(gSearch) || r.bookingId?.toLowerCase().includes(gSearch.toLowerCase());
    const matchesVip = !vipOnly || Boolean(r.vipTier);
    return matchesSearch && matchesVip;
  });

  const arrivingFiltered = arriving.filter(g => {
    const matchesSearch = !gSearch || g.name.toLowerCase().includes(gSearch.toLowerCase()) ||
      g.room.toLowerCase().includes(gSearch.toLowerCase()) || g.booking.toLowerCase().includes(gSearch.toLowerCase()) ||
      g.phone.includes(gSearch);
    const matchesVip = !vipOnly || Boolean(g.vip);
    return matchesSearch && matchesVip;
  });

  const departuresFiltered = departures.filter(g => {
    return !gSearch || g.name.toLowerCase().includes(gSearch.toLowerCase()) ||
      g.room.toLowerCase().includes(gSearch.toLowerCase());
  });

  const checkIn = async (guest: ArrivingGuest) => {
    if (!guest.reservationId || checkingIn) return;
    setCheckingIn(guest.id); setActionError(null);
    try {
      await onCheckIn(guest);
      setCheckedIn(ids => ids.includes(guest.id) ? ids : [...ids, guest.id]);
    } catch (error) {
      setActionError(apiErrorText(error));
    } finally {
      setCheckingIn(null);
    }
  };

  const submitCreateGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestFullName.trim() || !guestIdNumber.trim() || !guestPhone.trim()) {
      setActionError("Vui lòng điền đầy đủ họ tên, CCCD/CMND và số điện thoại.");
      return;
    }
    if (!/^[0-9+ .-]{8,15}$/.test(guestPhone.trim())) {
      setActionError("Số điện thoại phải có 8–15 ký tự, chỉ gồm chữ số, dấu +, khoảng trắng, dấu chấm hoặc dấu gạch ngang.");
      return;
    }
    setSubmittingModal(true);
    setActionError(null);
    try {
      const created = await frontDeskApi.createGuest({
        full_name: guestFullName.trim(),
        identity_number: guestIdNumber.trim(),
        phone: guestPhone.trim(),
        email: guestEmail.trim() || undefined,
      });
      setFeedback(`Đã tạo hồ sơ khách hàng #${created.id} - ${created.full_name} thành công.`);
      setShowCreateGuest(false);
      setGuestFullName(""); setGuestIdNumber(""); setGuestPhone(""); setGuestEmail("");
      if (gTab === "directory") void loadDirectory(gSearch);
      await onRefresh?.();
    } catch (err) {
      setActionError(apiErrorText(err));
    } finally {
      setSubmittingModal(false);
    }
  };

  return (
    <div style={{ flex:1,overflowY:"auto",background:"#F8FAFC" }}>
      <div style={{ padding:"20px 24px" }}>
        {/* Header */}
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:10 }}>
          <div>
            <h2 style={{ fontSize:18,fontWeight:700,color:"#0F172A",marginBottom:2 }}>Khách hàng</h2>
            <p style={{ fontSize:12,color:"#94A3B8" }}>Quản lý hồ sơ và trạng thái khách theo thời gian thực</p>
          </div>
          <div style={{ display:"flex",gap:8,alignItems:"center",flexWrap:"wrap" }}>
            <div style={{ position:"relative" }}>
              <Search size={13} style={{ position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#94A3B8",pointerEvents:"none" }} />
              <input value={gSearch} onChange={e=>setGSearch(e.target.value)}
                placeholder={gTab === "directory" ? "Tìm theo tên, SĐT, CCCD..." : "Tìm khách, số phòng, mã booking..."}
                style={{ height:34,paddingLeft:30,paddingRight:12,borderRadius:8,width:240,
                  border:"1px solid #E2E8F0",background:"#FFF",fontSize:12,outline:"none" }} />
            </div>
            {gTab !== "directory" && (
              <button onClick={()=>setVipOnly(v=>!v)} style={{ height:34,padding:"0 12px",borderRadius:8,border:`1px solid ${vipOnly?"#16A34A":"#E2E8F0"}`,
                background:vipOnly?"#DCFCE7":"#FFF",color:vipOnly?"#166534":"#475569",fontSize:12,fontWeight:vipOnly?600:400,cursor:"pointer",
                display:"flex",alignItems:"center",gap:6 }}>
                <Filter size={12} /> {vipOnly ? "Chỉ xem VIP" : "Lọc VIP"}
              </button>
            )}
            <button onClick={()=>setShowCreateGuest(true)}
              style={{ height:34,padding:"0 12px",borderRadius:8,background:"#0F172A",color:"#FFF",fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6 }}>
              <PlusCircle size={13} /> Thêm khách hàng
            </button>
            <button onClick={onCreateBooking}
              style={{ height:34,padding:"0 12px",borderRadius:8,background:"#16A34A",color:"#FFF",fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6 }}>
              <PlusCircle size={13} /> Tạo đặt phòng
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex",gap:0,borderBottom:"2px solid #E2E8F0",marginBottom:16 }}>
          {GTABS.map(t=>(
            <button key={t.id} onClick={()=>setGTab(t.id)}
              style={{ padding:"10px 18px",fontSize:13,fontWeight:gTab===t.id?600:400,cursor:"pointer",
                color:gTab===t.id?"#0F172A":"#64748B",background:"transparent",
                borderBottom:gTab===t.id?"2px solid #0F172A":"2px solid transparent",marginBottom:-2 }}>
              {t.label}
            </button>
          ))}
        </div>

        {actionError && !showCreateGuest && <div role="alert" style={{padding:"10px 12px",borderRadius:8,background:"#FFF1F2",color:"#BE123C",fontSize:12,marginBottom:12}}>{actionError}</div>}
        {feedback && <div role="status" style={{padding:"10px 12px",borderRadius:8,background:"#F0FDF4",color:"#166534",border:"1px solid #BBF7D0",fontSize:12,marginBottom:12}}>{feedback}</div>}

        {/* Staying table */}
        {gTab==="staying" && (
          <div style={{ background:"#FFF",borderRadius:12,border:"1px solid #E2E8F0",overflow:"hidden" }}>
            <table style={{ width:"100%",borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:"#F8FAFC" }}>
                  {["Khách hàng","Phòng","Loại phòng","Hạng","Nhận phòng","Trả phòng","Số dư","Trạng thái",""].map(h=>(
                    <th key={h} style={{ padding:"10px 14px",fontSize:11,fontWeight:600,color:"#64748B",textAlign:"left",whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stayingFiltered.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding:"28px 14px",textAlign:"center",fontSize:12,color:"#94A3B8" }}>
                      Chưa có khách đang lưu trú
                    </td>
                  </tr>
                ) : (
                  stayingFiltered.map((r,i)=>{
                    const due = r.folioTotal ?? 0;
                    const dueFmt = r.folioCurrency==="$"?fmtUSD(due):fmtVND(due);
                    return (
                      <tr key={r.id} style={{ borderTop:"1px solid #F1F5F9",background:i%2===0?"#FFF":"#FAFAFA" }}>
                        <td style={{ padding:"12px 14px" }}>
                          <div style={{ display:"flex",alignItems:"center",gap:9 }}>
                            <div style={{ width:30,height:30,borderRadius:99,flexShrink:0,
                              background:`hsl(${(i*47+220)%360},60%,85%)`,
                              display:"flex",alignItems:"center",justifyContent:"center",
                              fontSize:11,fontWeight:700,color:"#334155" }}>
                              {r.guestName?.split(" ").pop()?.charAt(0)}
                            </div>
                            <div>
                              <p style={{ fontSize:13,fontWeight:600,color:"#0F172A" }}>{r.guestName||"—"}</p>
                              <p style={{ fontSize:11,color:"#94A3B8",fontFamily:"'JetBrains Mono',monospace" }}>{r.bookingId||"—"}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding:"12px 14px",fontSize:14,fontWeight:700,color:"#0F172A" }}>{r.number}</td>
                        <td style={{ padding:"12px 14px",fontSize:12,color:"#475569" }}>{roomTypeLabel(r.type)}</td>
                        <td style={{ padding:"12px 14px" }}>
                          {r.vipTier?<VipBadge tier={r.vipTier} />:<span style={{ fontSize:11,color:"#94A3B8" }}>—</span>}
                        </td>
                        <td style={{ padding:"12px 14px",fontSize:12,color:"#475569" }}>{r.checkIn||"—"}</td>
                        <td style={{ padding:"12px 14px",fontSize:12,color:"#475569" }}>{r.checkOut||"—"}</td>
                        <td style={{ padding:"12px 14px" }}>
                          <span style={{ fontSize:12,fontWeight:700,color:due>0?"#DC2626":"#166534" }}>{dueFmt}</span>
                        </td>
                        <td style={{ padding:"12px 14px" }}>
                          <OccBadge s={r.occStatus} />
                        </td>
                        <td style={{ padding:"12px 14px" }}>
                          <div style={{ display:"flex",gap:6 }}>
                            <button onClick={()=>onOpenRoom(r.id)} style={{ fontSize:11,fontWeight:600,color:"#2563EB",cursor:"pointer",whiteSpace:"nowrap" }}>Xem</button>
                            <span style={{ color:"#E2E8F0" }}>|</span>
                            <button onClick={()=>onOpenRoom(r.id)} style={{ fontSize:11,fontWeight:600,color:"#64748B",cursor:"pointer",whiteSpace:"nowrap" }}>Trả phòng</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Arriving table */}
        {gTab==="arriving" && (
          <div style={{ background:"#FFF",borderRadius:12,border:"1px solid #E2E8F0",overflow:"hidden" }}>
            <table style={{ width:"100%",borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:"#F8FAFC" }}>
                  {["Khách hàng","Phòng","Loại phòng","Mã đặt phòng","Nhận phòng","Trả phòng","Liên hệ","Trạng thái",""].map(h=>(
                    <th key={h} style={{ padding:"10px 14px",fontSize:11,fontWeight:600,color:"#64748B",textAlign:"left",whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {arrivingFiltered.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding:"28px 14px",textAlign:"center",fontSize:12,color:"#94A3B8" }}>
                      Hôm nay không có khách đến
                    </td>
                  </tr>
                ) : (
                  arrivingFiltered.map((g,i)=>(
                    <tr key={g.id} style={{ borderTop:"1px solid #F1F5F9",background:i%2===0?"#FFF":"#FAFAFA" }}>
                      <td style={{ padding:"12px 14px" }}>
                        <div style={{ display:"flex",alignItems:"center",gap:9 }}>
                          <div style={{ width:30,height:30,borderRadius:99,flexShrink:0,
                            background:"linear-gradient(135deg,#6366F1,#8B5CF6)",
                            display:"flex",alignItems:"center",justifyContent:"center",
                            fontSize:11,fontWeight:700,color:"#FFF" }}>
                            {g.name.split(" ").pop()?.charAt(0)}
                          </div>
                          <div>
                            <p style={{ fontSize:13,fontWeight:600,color:"#0F172A" }}>{g.name}</p>
                            {g.vip&&<VipBadge tier={g.vip as VipTier} />}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding:"12px 14px",fontSize:14,fontWeight:700,color:"#0F172A" }}>{g.room}</td>
                      <td style={{ padding:"12px 14px",fontSize:12,color:"#475569" }}>{roomTypeLabel(g.type)}</td>
                      <td style={{ padding:"12px 14px",fontSize:12,color:"#64748B",fontFamily:"'JetBrains Mono',monospace" }}>{g.booking}</td>
                      <td style={{ padding:"12px 14px",fontSize:12,color:"#475569" }}>{g.ci}</td>
                      <td style={{ padding:"12px 14px",fontSize:12,color:"#475569" }}>{g.co}</td>
                      <td style={{ padding:"12px 14px" }}>
                        <div style={{ display:"flex",alignItems:"center",gap:5 }}>
                          <Phone size={11} style={{ color:"#94A3B8" }} />
                          <span style={{ fontSize:12,color:"#475569" }}>{g.phone}</span>
                        </div>
                      </td>
                      <td style={{ padding:"12px 14px" }}>
                        <span style={{ fontSize:11,fontWeight:500,padding:"2px 8px",borderRadius:99,
                          background:checkedIn.includes(g.id)?"#DCFCE7":"#DBEAFE",color:checkedIn.includes(g.id)?"#166534":"#1D4ED8" }}>
                          {checkedIn.includes(g.id)?"Đã nhận phòng":"Đang chờ xác nhận"}
                        </span>
                      </td>
                      <td style={{ padding:"12px 14px" }}>
                        <button disabled={!g.reservationId||checkedIn.includes(g.id)||checkingIn!==null} onClick={()=>void checkIn(g)}
                          style={{ fontSize:11,fontWeight:600,color:checkedIn.includes(g.id)?"#94A3B8":"#16A34A",cursor:g.reservationId&&checkingIn===null?"pointer":"not-allowed" }}>
                          {checkingIn===g.id?"Đang nhận phòng…":checkedIn.includes(g.id)?"Đã nhận phòng":g.reservationId?"Nhận phòng":"Không có mã đặt phòng"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Departed table */}
        {gTab==="departed" && (
          <div style={{ background:"#FFF",borderRadius:12,border:"1px solid #E2E8F0",overflow:"hidden" }}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr style={{background:"#F8FAFC"}}>{["Khách hàng","Phòng","Loại phòng","Trạng thái","Công nợ",""].map(h=><th key={h} style={{padding:"10px 14px",fontSize:11,fontWeight:600,color:"#64748B",textAlign:"left"}}>{h}</th>)}</tr></thead>
              <tbody>
                {departuresFiltered.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding:"28px 14px",textAlign:"center",fontSize:12,color:"#94A3B8" }}>
                      Hôm nay không có khách trả phòng
                    </td>
                  </tr>
                ) : (
                  departuresFiltered.map((g,i)=>(
                    <tr key={g.id} style={{borderTop:"1px solid #F1F5F9",background:i%2===0?"#FFF":"#FAFAFA"}}>
                      <td style={{padding:"12px 14px",fontSize:13,fontWeight:600}}>{g.name}</td>
                      <td style={{padding:"12px 14px",fontSize:13,fontWeight:700}}>{g.room}</td>
                      <td style={{padding:"12px 14px",fontSize:12,color:"#475569"}}>{roomTypeLabel(g.type)}</td>
                      <td style={{padding:"12px 14px"}}><span style={{fontSize:11,padding:"2px 8px",borderRadius:99,background:g.status==="overdue"?"#FFE4E6":"#DCFCE7",color:g.status==="overdue"?"#BE123C":"#166534"}}>{g.status==="overdue"?"Quá hạn":"Đã trả phòng"}</span></td>
                      <td style={{padding:"12px 14px",fontSize:12,fontWeight:700,color:g.balanceOk?"#166534":"#DC2626"}}>{g.balanceOk?"Đã tất toán":"Còn công nợ"}</td>
                      <td style={{padding:"12px 14px",textAlign:"right"}}>
                        <button onClick={()=>onOpenRoom(g.room)} style={{ fontSize:11,fontWeight:600,color:"#2563EB",cursor:"pointer" }}>Xem phòng</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Directory / Guest Lookup table */}
        {gTab==="directory" && (
          <div style={{ background:"#FFF",borderRadius:12,border:"1px solid #E2E8F0",overflow:"hidden" }}>
            <table style={{ width:"100%",borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:"#F8FAFC" }}>
                  {["Mã khách","Họ và tên","CCCD / Hộ chiếu","Số điện thoại","Email","Tổng chi tiêu"].map(h => (
                    <th key={h} style={{ padding:"10px 14px",fontSize:11,fontWeight:600,color:"#64748B",textAlign:"left",whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {directoryLoading ? (
                  <tr><td colSpan={6} style={{ padding:"28px 14px",textAlign:"center",fontSize:12,color:"#94A3B8" }}>Đang tải danh sách khách hàng…</td></tr>
                ) : directoryGuests.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding:"28px 14px",textAlign:"center",fontSize:12,color:"#94A3B8" }}>Không tìm thấy thông tin khách hàng phù hợp</td></tr>
                ) : (
                  directoryGuests.map((gst, i) => (
                    <tr key={gst.id} style={{ borderTop:"1px solid #F1F5F9",background:i%2===0?"#FFF":"#FAFAFA" }}>
                      <td style={{ padding:"12px 14px",fontFamily:"'JetBrains Mono',monospace",fontSize:12,fontWeight:600,color:"#64748B" }}>#{gst.id}</td>
                      <td style={{ padding:"12px 14px",fontSize:13,fontWeight:600,color:"#0F172A" }}>{gst.full_name}</td>
                      <td style={{ padding:"12px 14px",fontSize:12,color:"#475569" }}>{gst.identity_number}</td>
                      <td style={{ padding:"12px 14px",fontSize:12,color:"#475569" }}>{gst.phone}</td>
                      <td style={{ padding:"12px 14px",fontSize:12,color:"#64748B" }}>{gst.email || "—"}</td>
                      <td style={{ padding:"12px 14px",fontSize:12,fontWeight:600,color:"#166534" }}>{fmtVND(gst.total_spend || 0)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create Guest */}
      {showCreateGuest && (
        <div style={{ position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(15,23,42,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,padding:20 }}>
          <div style={{ background:"#FFF",borderRadius:14,width:"100%",maxWidth:480,boxShadow:"0 20px 25px -5px rgba(0,0,0,.2)",overflow:"hidden" }}>
            <div style={{ padding:"16px 20px",borderBottom:"1px solid #E2E8F0",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
              <h3 style={{ fontSize:15,fontWeight:700,color:"#0F172A" }}>Tạo hồ sơ khách hàng mới</h3>
              <button onClick={()=>setShowCreateGuest(false)} style={{ cursor:"pointer",color:"#94A3B8" }}><X size={18} /></button>
            </div>
            <form aria-label="Tạo hồ sơ khách hàng" onSubmit={submitCreateGuest} style={{ padding:20,display:"flex",flexDirection:"column",gap:12 }}>
              {actionError && <div role="alert" style={{padding:"10px 12px",borderRadius:8,background:"#FFF1F2",color:"#BE123C",fontSize:12}}>{actionError}</div>}
              <label style={{ fontSize:12,fontWeight:600,color:"#334155" }}>
                Họ và tên *
                <input required value={guestFullName} onChange={e=>setGuestFullName(e.target.value)} placeholder="Nguyễn Văn A"
                  style={{ width:"100%",height:36,border:"1px solid #CBD5E1",borderRadius:7,padding:"0 10px",fontSize:13,marginTop:4,boxSizing:"border-box" }} />
              </label>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
                <label style={{ fontSize:12,fontWeight:600,color:"#334155" }}>
                  CCCD / Hộ chiếu *
                  <input required value={guestIdNumber} onChange={e=>setGuestIdNumber(e.target.value)} placeholder="001200001234"
                    style={{ width:"100%",height:36,border:"1px solid #CBD5E1",borderRadius:7,padding:"0 10px",fontSize:13,marginTop:4,boxSizing:"border-box" }} />
                </label>
                <label style={{ fontSize:12,fontWeight:600,color:"#334155" }}>
                  Số điện thoại *
                  <input required value={guestPhone} onChange={e=>setGuestPhone(e.target.value)} placeholder="0901234567"
                    style={{ width:"100%",height:36,border:"1px solid #CBD5E1",borderRadius:7,padding:"0 10px",fontSize:13,marginTop:4,boxSizing:"border-box" }} />
                </label>
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr",gap:10 }}>
                <label style={{ fontSize:12,fontWeight:600,color:"#334155" }}>
                  Email
                  <input type="email" value={guestEmail} onChange={e=>setGuestEmail(e.target.value)} placeholder="guest@example.com"
                    style={{ width:"100%",height:36,border:"1px solid #CBD5E1",borderRadius:7,padding:"0 10px",fontSize:13,marginTop:4,boxSizing:"border-box" }} />
                </label>
              </div>
              <div style={{ display:"flex",justifyContent:"flex-end",gap:8,marginTop:8 }}>
                <button type="button" onClick={()=>setShowCreateGuest(false)} style={{ padding:"8px 14px",borderRadius:7,border:"1px solid #E2E8F0",fontSize:12,fontWeight:600,color:"#64748B",cursor:"pointer" }}>Hủy</button>
                <button type="submit" disabled={submittingModal} style={{ padding:"8px 18px",borderRadius:7,background:"#0F172A",color:"#FFF",fontSize:12,fontWeight:700,cursor:submittingModal?"not-allowed":"pointer" }}>
                  {submittingModal ? "Đang lưu…" : "Tạo hồ sơ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SHARED HEADER
══════════════════════════════════════════════════════════ */
function TopHeader({ search, setSearch, actorName, onLogout }: { search:string; setSearch:(v:string)=>void; actorName:string; onLogout:()=>void }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const initial = actorName ? actorName.trim().charAt(0).toUpperCase() : "L";

  return (
    <header style={{ background:"#FFF",borderBottom:"1px solid #E2E8F0",height:56,
      display:"flex",alignItems:"center",gap:12,padding:"0 20px",flexShrink:0 }}>
      <div style={{ flex:1,position:"relative",maxWidth:440 }}>
        <Search size={13} style={{ position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",
          color:"#94A3B8",pointerEvents:"none" }} />
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Tìm tên khách, CCCD, số phòng, mã booking"
          style={{ width:"100%",height:34,paddingLeft:34,paddingRight:12,
            borderRadius:8,border:"1px solid #E2E8F0",background:"#F8FAFC",
            fontSize:13,color:"#0F172A",outline:"none" }}
          onFocus={e=>{ e.target.style.borderColor="#94A3B8"; e.target.style.background="#FFF"; }}
          onBlur={e=>{  e.target.style.borderColor="#E2E8F0"; e.target.style.background="#F8FAFC"; }}
        />
      </div>
      <div style={{ flex:1 }} />
      <div style={{ display:"flex",alignItems:"center",gap:4,color:"#475569",fontSize:12 }}>
        <User size={12} style={{ color:"#94A3B8" }} />
        <span>Lễ tân:</span>
        <span style={{ fontWeight:600,color:"#0F172A" }}>{actorName}</span>
      </div>
      <div style={{ width:1,height:18,background:"#E2E8F0" }} />
      <div style={{ display:"flex",alignItems:"center",gap:4,color:"#475569",fontSize:12 }}>
        <LayoutGrid size={12} style={{ color:"#94A3B8" }} />
        <span>Bàn số:</span>
        <span style={{ fontWeight:600,color:"#0F172A" }}>FD-02</span>
      </div>
      <button style={{ width:34,height:34,borderRadius:8,background:"#F8FAFC",border:"1px solid #E2E8F0",
        display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",position:"relative" }}>
        <Bell size={14} style={{ color:"#475569" }} />
        <span style={{ position:"absolute",top:6,right:6,width:7,height:7,borderRadius:99,background:"#EF4444" }} />
      </button>
      <div style={{ position:"relative" }}>
        <div onClick={()=>setProfileOpen(p=>!p)} style={{ display:"flex",alignItems:"center",gap:6,cursor:"pointer" }} title="Hồ sơ nhân viên">
          <div style={{ width:30,height:30,borderRadius:99,
            background:"linear-gradient(135deg,#6366F1,#8B5CF6)",
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:11,fontWeight:700,color:"#FFF" }}>{initial}</div>
          <ChevronDown size={12} style={{ color:"#94A3B8" }} />
        </div>
        <EmployeeProfileDropdown
          isOpen={profileOpen}
          onClose={()=>setProfileOpen(false)}
          onLogout={onLogout}
          align="top-right"
          currentRoleLabel="Lễ tân"
          departmentName="Bộ phận Tiền sảnh"
        />
      </div>
    </header>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function FrontDeskPMS({ onBack }: { onBack: () => void }) {
  const [page, setPage]     = useState<NavPage>("overview");
  const [search, setSearch] = useState("");
  const [liveRooms, setLiveRooms] = useState<Room[]>([]);
  const [liveStaying, setLiveStaying] = useState<Room[]>([]);
  const [liveArriving, setLiveArriving] = useState<ArrivingGuest[]>([]);
  const [liveOverviewArrivals, setLiveOverviewArrivals] = useState<OverviewArrival[]>([]);
  const [liveDepartures, setLiveDepartures] = useState<DepartureGuest[]>([]);
  const [liveAlerts, setLiveAlerts] = useState<LiveAlert[]>([]);
  const [liveActivities, setLiveActivities] = useState<LiveActivity[]>([]);
  const [dataState, setDataState] = useState<"loading" | "live" | "fallback">("loading");
  const [dataError, setDataError] = useState<string | null>(null);
  const [focusRoomId, setFocusRoomId] = useState<string | null>(null);
  const [unsettledInvoices, setUnsettledInvoices] = useState<DashboardItem[]>([]);
  const [settlementRoom, setSettlementRoom] = useState<Room | null>(null);
  const [settlementError, setSettlementError] = useState<string | null>(null);
  const [openingSettlement, setOpeningSettlement] = useState<number | null>(null);
  const [createBookingRequest, setCreateBookingRequest] = useState<{ room?: Room } | null>(null);
  const [bookingNotice, setBookingNotice] = useState<{ text: string; tone: "success" | "warning" } | null>(null);
  const [actorId, setActorId] = useState("");
  const [actorName, setActorName] = useState("Nhân viên Lễ tân");
  const [sidebarProfileOpen, setSidebarProfileOpen] = useState(false);
  const requestSequence = useRef(0);
  const checkInKeys = useRef(new Map<number, string>());

  const loadDashboard = useCallback(async (query = "") => {
    const sequence = ++requestSequence.current;
    setDataState(previous=>previous==="live"?"live":"loading");
    try {
      const dashboardResult = await Promise.allSettled([
        frontDeskApi.dashboard(query.trim() ? { q: query.trim() } : {}),
      ]).then(([result]) => result);
      if (sequence !== requestSequence.current) return;
      if (dashboardResult.status === "rejected") throw dashboardResult.reason;
      const dashboard: Dashboard = dashboardResult.value;
      setUnsettledInvoices(dashboard.invoice_balances.filter(item => item.status === "CHECKED_OUT" && item.invoice_balance > 0));
      // Ưu tiên khách đang ở/đến hôm nay; dùng booking sắp tới để card phòng vẫn thể hiện
      // phòng đã được giữ mà không làm sai KPI "khách đến hôm nay".
      const stays = [...dashboard.current_stays, ...dashboard.arrivals, ...dashboard.departures,
        ...(dashboard.upcoming_stays ?? [])];
      const findStay = (roomId: string) => stays.find(item => item.room_ids.includes(roomId));
      const mappedRooms = dashboard.rooms.map((raw): Room => {
        const status = raw.status.toUpperCase();
        const roomCannotHostGuest = ["CLEANING", "DIRTY", "NEEDS_CLEANING", "OUT_OF_SERVICE", "MAINTENANCE", "BLOCKED", "CANCELLED", "RETURNED"].includes(status);
        // Trạng thái vận hành của phòng thắng dữ liệu read-model bị trễ: phòng đang dọn/bảo trì
        // tuyệt đối không được hiện khách hoặc mở thao tác chuyển phòng.
        const stay = roomCannotHostGuest ? undefined : findStay(raw.room_id);
        const occupied = status === "OCCUPIED" || stay?.status === "CHECKED_IN";
        const isReserved = status === "RESERVED" || stay?.status === "CONFIRMED";
        return {
          id: raw.room_id, number: raw.name, floor: raw.floor, operationalStatus: raw.status,
          type: raw.room_type_name || raw.room_type_id, beds: raw.bed_type || "Đang cập nhật",
          dailyPrice: raw.daily_price,
          occStatus: ["OUT_OF_SERVICE","MAINTENANCE","BLOCKED"].includes(status) ? "ood" : occupied ? "occupied" : isReserved ? "reserved" : "vacant",
          cleanStatus: status === "CLEANING" ? "cleaning" : ["DIRTY","NEEDS_CLEANING"].includes(status) ? "dirty" : "clean",
          guestName: stay?.guest_name, guestPhone: stay?.guest_phone, bookingId: stay ? `BK-${stay.reservation_id}` : undefined,
          checkIn: stay?.check_in, checkOut: stay?.check_out,
          folioTotal: stay?.invoice_balance, folioCurrency: "VND",
          reservationId: stay?.reservation_id, guestId: stay?.guest_id, reservationStatus: stay?.status,
        };
      });
      const toArriving = (item: DashboardItem): ArrivingGuest => ({
        id:`ga-${item.reservation_id}`, name:item.guest_name, room:item.room_ids[0]??"—", type:dashboard.rooms.find(room=>room.room_id===item.room_ids[0])?.room_type_id??"Phòng",
        booking:`BK-${item.reservation_id}`, ci:item.check_in, co:item.check_out, vip:null, phone:item.guest_phone, reservationId:item.reservation_id,
      });
      setLiveRooms(mappedRooms);
      setLiveStaying(mappedRooms.filter(room=>room.reservationStatus==="CHECKED_IN"));
      setLiveArriving(dashboard.arrivals.map(toArriving));
      setLiveOverviewArrivals(dashboard.arrivals.map((item,index)=>({ id:`a-${item.reservation_id}`,name:item.guest_name,room:item.room_ids[0]??"—",type:dashboard.rooms.find(room=>room.room_id===item.room_ids[0])?.room_type_id??"Phòng",booking:`BK-${item.reservation_id}`,eta:fmtDateTime(item.check_in),vip:null,status:"expected" })));
      setLiveDepartures(dashboard.departures.map(item=>({ id:`d-${item.reservation_id}`,name:item.guest_name,room:item.room_ids[0]??"—",type:dashboard.rooms.find(room=>room.room_id===item.room_ids[0])?.room_type_id??"Phòng",balanceOk:item.invoice_balance<=0,status:"pending",reservationId:item.reservation_id })));
      const now = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
      setLiveAlerts(dashboard.incidents.map(item => ({ id: `incident-${item.id}`, type: "warning" as const, msg: `P.${item.room_id}: Có sự cố cần xử lý`, time: now })));
      setLiveActivities([
        ...dashboard.arrivals.map(item => ({ id: `arrival-${item.reservation_id}`, time: fmtDateTime(item.check_in), msg: `${item.guest_name} dự kiến nhận phòng P.${item.room_ids[0] ?? "—"}`, icon: "checkin" })),
        ...dashboard.departures.map(item => ({ id: `departure-${item.reservation_id}`, time: fmtDateTime(item.check_out), msg: `${item.guest_name} dự kiến trả phòng P.${item.room_ids[0] ?? "—"}`, icon: "user" })),
      ].slice(0, 8));
      setDataState("live"); setDataError(null);
    } catch (error) {
      if (sequence !== requestSequence.current) return;
      setLiveRooms([]); setLiveStaying([]); setLiveArriving([]); setLiveOverviewArrivals([]); setLiveDepartures([]);
      setLiveAlerts([]); setLiveActivities([]); setUnsettledInvoices([]);
      setDataState("fallback"); setDataError(apiErrorText(error));
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(()=>void loadDashboard(search), search ? 300 : 0);
    return ()=>window.clearTimeout(timeout);
  }, [loadDashboard, search]);

  useEffect(() => {
    let active = true;
    authApi.employeeProfile().then(profile=>{ if (active) { setActorId(profile.employee_id); setActorName(profile.full_name || "Nhân viên Lễ tân"); } }).catch(error=>{ if(active) {setActorId(""); setDataError(apiErrorText(error));} });
    return ()=>{active=false;};
  }, []);

  const handleCheckInById = useCallback(async (reservationId: number) => {
    const stableKey = checkInKeys.current.get(reservationId) ?? newFrontDeskIdempotencyKey();
    checkInKeys.current.set(reservationId, stableKey);
    await frontDeskApi.checkIn(reservationId, {}, stableKey);
    checkInKeys.current.delete(reservationId);
    await loadDashboard(search);
  }, [loadDashboard, search]);

  const handleCheckIn = async (guest: ArrivingGuest) => {
    if (!guest.reservationId) throw new Error("Không tìm thấy mã đặt phòng.");
    await handleCheckInById(guest.reservationId);
  };

  useEffect(() => {
    const timer = window.setInterval(() => { void loadDashboard(search); }, 15000);
    return () => window.clearInterval(timer);
  }, [loadDashboard, search]);

  const openRoom = (roomId: string) => { setFocusRoomId(roomId); setPage("rooms"); };
  const openCreateBooking = (room?: Room) => setCreateBookingRequest({ room });
  const finishCreateBooking = (reservation: Reservation) => {
    setCreateBookingRequest(null);
    setBookingNotice({ tone: "success", text: `Đã tạo lượt lưu trú BK-${reservation.id} cho phòng ${reservation.rooms[0]?.room_id ?? "—"}.` });
    void loadDashboard(search);
  };
  const openSettlement = async (item: DashboardItem) => {
    setOpeningSettlement(item.reservation_id); setSettlementError(null);
    try {
      const reservation = await frontDeskApi.reservation(item.reservation_id);
      const stay = reservation.rooms[0];
      const physicalRoom = liveRooms.find(room => room.id === stay?.room_id);
      if (!stay || !physicalRoom) throw new Error("Không tìm thấy phòng của hóa đơn này.");
      setSettlementRoom({ ...physicalRoom, reservationId: reservation.id, reservationStatus: reservation.status,
        guestId: item.guest_id, guestName: item.guest_name, guestPhone: item.guest_phone, bookingId: `BK-${reservation.id}`,
        checkIn: stay.expected_check_in, checkOut: stay.expected_check_out });
    } catch (error) { setSettlementError(apiErrorText(error)); }
    finally { setOpeningSettlement(null); }
  };

  const displayRooms = liveRooms;
  const displayStaying = liveStaying;
  const displayArriving = liveArriving;
  const displayOverviewArrivals = liveOverviewArrivals;
  const displayDepartures = liveDepartures;
  const displayAlerts = liveAlerts;
  const displayActivities = liveActivities;

  const NAV: { id: NavPage; label: string; Icon: React.ElementType }[] = [
    { id:"overview", label:"Tổng quan",       Icon:Home },
    { id:"rooms",    label:"Sơ đồ phòng",     Icon:LayoutGrid },
    { id:"guests",   label:"Khách hàng",      Icon:Users },
  ];

  return (
    <div style={{ display:"flex",height:"100vh",overflow:"hidden",
      background:"#F8FAFC",fontFamily:"'Inter',system-ui,sans-serif",fontSize:14 }}>

      {/* SIDEBAR */}
      <aside style={{ width:188,background:"#FFF",borderRight:"1px solid #E2E8F0",
        display:"flex",flexDirection:"column",flexShrink:0 }}>
        {/* Logo */}
        <div style={{ padding:"14px 16px 12px",borderBottom:"1px solid #E2E8F0" }}>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <img
              src="/hotel_logo.png"
              alt="MaM Hotel Logo"
              style={{ width:38,height:"auto",objectFit:"contain",flexShrink:0,filter:"drop-shadow(0 2px 6px rgba(184,148,74,0.35))" }}
            />
            <div>
              <p style={{ fontSize:14,fontWeight:700,color:"#0F172A",lineHeight:1.1,fontFamily:"'Cormorant Garamond',Georgia,serif",letterSpacing:"0.05em" }}>MaM Hotel</p>
              <p style={{ fontSize:9,color:"#B8944A",letterSpacing:"0.12em",textTransform:"uppercase",marginTop:2,fontWeight:600 }}>HỆ THỐNG LỄ TÂN</p>
            </div>
          </div>
        </div>
        {/* Nav */}
        <nav style={{ flex:1,padding:"10px 8px",overflowY:"auto" }}>
          {NAV.map(n => {
            const active = page === n.id;
            return (
              <button key={n.id} onClick={()=>setPage(n.id)}
                style={{ width:"100%",display:"flex",alignItems:"center",gap:9,
                  padding:"8px 10px",borderRadius:8,cursor:"pointer",marginBottom:2,
                  background:active?"#DBEAFE":"transparent",
                  color:active?"#1D4ED8":"#475569",fontWeight:active?600:400,fontSize:13,
                  textAlign:"left",transition:"all .1s" }}>
                <n.Icon size={15} style={{ color:active?"#3B82F6":"#94A3B8",flexShrink:0 }} strokeWidth={active?2:1.5} />
                {n.label}
              </button>
            );
          })}
        </nav>
        {/* Profile */}
        <div style={{ padding:"10px 14px",borderTop:"1px solid #F1F5F9",position:"relative" }}>
          <div
            onClick={()=>setSidebarProfileOpen(p=>!p)}
            style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8,cursor:"pointer" }}
            title="Hồ sơ nhân viên"
          >
            <div style={{ width:30,height:30,borderRadius:99,flexShrink:0,
              background:"linear-gradient(135deg,#1D4ED8,#3B82F6)",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:12,fontWeight:800,color:"#FFF" }}>LT</div>
            <div>
              <p style={{ fontSize:11,fontWeight:700,color:"#0F172A",lineHeight:1 }}>{actorName || "Nhân viên Lễ tân"}</p>
              <p style={{ fontSize:10,color:"#94A3B8" }}>Bộ phận Tiền sảnh</p>
            </div>
          </div>
          <button onClick={onBack}
            style={{ display:"flex",alignItems:"center",gap:5,color:"#94A3B8",cursor:"pointer",fontSize:11,background:"transparent",border:"none",padding:0 }}>
            <LogOut size={11} /> Đăng xuất
          </button>
          <EmployeeProfileDropdown
            isOpen={sidebarProfileOpen}
            onClose={()=>setSidebarProfileOpen(false)}
            onLogout={onBack}
            align="bottom-left"
              currentRoleLabel="Lễ tân"
            departmentName="Bộ phận Tiền sảnh"
          />
        </div>
      </aside>

      {/* MAIN */}
      <div style={{ flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0 }}>
        <TopHeader search={search} setSearch={setSearch} actorName={actorName} onLogout={onBack} />
        <KpiBar rooms={displayRooms} arrivals={displayArriving.length} departures={displayDepartures.length} />
        {bookingNotice && <div role="status" style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,padding:"10px 16px",background:bookingNotice.tone==="success"?"#F0FDF4":"#FFFBEB",borderBottom:`1px solid ${bookingNotice.tone==="success"?"#BBF7D0":"#FDE68A"}`,color:bookingNotice.tone==="success"?"#166534":"#92400E",fontSize:12}}><span>{bookingNotice.text}</span><button type="button" aria-label="Đóng thông báo đặt phòng" onClick={()=>setBookingNotice(null)} style={{fontWeight:700,color:bookingNotice.tone==="success"?"#166534":"#92400E"}}>Đóng</button></div>}
        {page === "overview" && unsettledInvoices.length > 0 && <section aria-label="Hóa đơn chưa tất toán" style={{padding:"12px 20px",background:"#FFFBEB",borderBottom:"1px solid #FDE68A",maxHeight:180,overflowY:"auto",flexShrink:0}}>
          <p style={{fontWeight:700,fontSize:13,marginBottom:6}}>Đã trả phòng · Chưa tất toán</p>
          {unsettledInvoices.map(item => <div key={item.reservation_id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,padding:"5px 0",fontSize:12}}>
            <span>BK-{item.reservation_id} · {item.guest_name} · Còn thu {fmtVND(item.invoice_balance)}</span>
            <button disabled={openingSettlement !== null} onClick={()=>void openSettlement(item)} style={{color:"#1D4ED8",fontWeight:700,whiteSpace:"nowrap"}}>Tiếp tục quyết toán BK-{item.reservation_id}</button>
          </div>)}
        </section>}
        {settlementError && <p role="alert" style={{padding:12,color:"#BE123C"}}>{settlementError}</p>}
        {page==="overview" && <OverviewScreen arrivals={displayOverviewArrivals} departures={displayDepartures} alerts={displayAlerts} activities={displayActivities} dataState={dataState} dataError={dataError} onRetry={()=>void loadDashboard(search)} onOpenRoom={openRoom} actorName={actorName} />}
        {(page==="rooms" || page==="guests") && dataState!=="live" && <div role={dataState==="fallback"?"alert":"status"} style={{padding:"12px 20px",background:dataState==="fallback"?"#FFFBEB":"#EFF6FF",color:"#334155",fontSize:13}}>
          <span>{dataState==="loading"?"Đang tải thông tin vận hành…":`Không tải được thông tin vận hành. ${dataError??""}`}</span>
          {dataState==="fallback" && <button onClick={()=>void loadDashboard(search)} style={{marginLeft:12,fontWeight:700,color:"#1D4ED8"}}>Thử lại</button>}
        </div>}
        {page==="rooms"    && <RoomMapScreen rooms={displayRooms} dataState={dataState} focusRoomId={focusRoomId} onRefresh={()=>loadDashboard(search)} onCheckIn={handleCheckInById} onCreateBooking={openCreateBooking} />}
        {page==="guests"   && <GuestsScreen staying={displayStaying} arriving={displayArriving} departures={displayDepartures} onCheckIn={handleCheckIn} onOpenRoom={openRoom} onRefresh={()=>void loadDashboard(search)} onCreateBooking={()=>openCreateBooking()} />}
      </div>
      {createBookingRequest && <CreateBookingModal actorId={actorId} initialRoom={createBookingRequest.room} onClose={()=>setCreateBookingRequest(null)} onCreated={finishCreateBooking} />}
      {settlementRoom && <div role="dialog" aria-label={`Quyết toán ${settlementRoom.bookingId}`} aria-modal="true" style={{position:"fixed",inset:0,zIndex:100,background:"#0F172A66",display:"flex",justifyContent:"flex-end"}}>
        <RoomDrawer room={settlementRoom} rooms={displayRooms} onClose={()=>{setSettlementRoom(null);void loadDashboard(search);}} onRefresh={()=>loadDashboard(search)} onSettlementChange={()=>{}} />
      </div>}
    </div>
  );
}


/* Dịch vụ đã ghi nhận trong chi tiết phòng. */
type Usage = { id:number; service_name:string; quantity:number; amount:number; cancelled:boolean };
function ServiceUsageHistory({reservationId, refreshKey, locked, checkingInvoice=false, onChanged}: {
  reservationId:number; refreshKey?:number; locked:boolean; checkingInvoice?:boolean; onChanged:()=>Promise<void>;
}) {
  const [rows,setRows]=useState<Usage[]>([]);
  const [version,setVersion]=useState(0);
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  useEffect(()=>{
    let active=true; setError(""); setRows([]); setLoading(true);
    apiClient.request<Usage[]>(`/api/service-usages?reservation_id=${reservationId}`)
      .then(data=>{if(active)setRows(data);})
      .catch(e=>{if(active)setError(apiErrorMessage(e,"Không thể tải dịch vụ đã ghi."));})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[reservationId,refreshKey,version]);
  async function cancel(id:number) {
    if(busy||locked||checkingInvoice)return;
    setBusy(true);setError("");
    try {
      await apiClient.request(`/api/service-usages/${id}`,{method:"DELETE"});
      setVersion(v=>v+1);await onChanged();
    } catch(e) {setError(apiErrorMessage(e,"Không thể hủy dịch vụ."));}
    finally {setBusy(false);}
  }
  return <section aria-label="Dịch vụ lễ tân đã ghi" className="mt-4 rounded-lg border border-slate-200 p-3 text-xs">
    <h3 className="mb-2 font-semibold">Dịch vụ đã ghi nhận</h3>
    {error&&<p role="alert" className="mb-2 text-red-700">{error} <button onClick={()=>setVersion(v=>v+1)}>Tải lại</button></p>}
    {loading&&<p>Đang tải dịch vụ…</p>}
    {locked&&<p className="mb-2 text-slate-500">Đã có hóa đơn: không thể hủy dịch vụ.</p>}
    {checkingInvoice&&<p className="mb-2 text-slate-500">Chưa xác nhận được hóa đơn; tạm khóa hủy dịch vụ.</p>}
    {rows.map(row=><div key={row.id} className="flex items-center justify-between gap-3 border-t border-slate-100 py-2">
      <span>{row.service_name} × {row.quantity} · {row.amount.toLocaleString("vi-VN")} ₫</span>
      {row.cancelled?<span>Đã hủy</span>:<button disabled={busy||locked||checkingInvoice} className="rounded border border-slate-300 px-2 py-1 disabled:opacity-50" onClick={()=>void cancel(row.id)}>Hủy dịch vụ</button>}
    </div>)}
    {!loading&&!error&&!rows.length&&<p>Chưa có dịch vụ.</p>}
  </section>;
}
