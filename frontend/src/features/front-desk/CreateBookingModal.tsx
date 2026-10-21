import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ApiError, apiErrorMessage } from "../../shared/api/client";
import { frontDeskApi, newFrontDeskIdempotencyKey } from "../../shared/api/frontDesk";
import type { Guest, Reservation } from "../../shared/types/frontDesk";
import { localDateTimeValue } from "../../shared/utils/localDate";
import type { Room } from "./types";
import { formatVnd } from "../../shared/utils/money";
const roomTypeLabel = (type: string) => ({ "Standard Room":"Phòng tiêu chuẩn", "Deluxe King":"Deluxe giường King", "Deluxe Twin":"Deluxe hai giường", "Superior Queen":"Superior giường Queen", "Superior Twin":"Superior hai giường", "Executive Suite":"Suite điều hành" }[type] ?? type);
const apiErrorText = (error: unknown) => error instanceof ApiError ? apiErrorMessage(error, "Không thể hoàn tất thao tác.") : "Không thể kết nối hệ thống. Vui lòng thử lại.";

export function CreateBookingModal({ actorId, initialRoom, onClose, onCreated }: { actorId: string; initialRoom?: Room; onClose: () => void; onCreated: (reservation: Reservation) => void }) {
  const [guestSearch, setGuestSearch] = useState("");
  const [guestMatches, setGuestMatches] = useState<Guest[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [searchingGuests, setSearchingGuests] = useState(false);
  const [newGuestMode, setNewGuestMode] = useState(false);
  const [newGuestName, setNewGuestName] = useState("");
  const [newGuestIdentity, setNewGuestIdentity] = useState("");
  const [newGuestPhone, setNewGuestPhone] = useState("");
  const [newGuestEmail, setNewGuestEmail] = useState("");
  const [roomId, setRoomId] = useState(initialRoom?.id ?? "");
  const [checkIn, setCheckIn] = useState(() => {
    const date = new Date();
    date.setHours(date.getHours() + 1, 0, 0, 0);
    return localDateTimeValue(date);
  });
  const [checkOut, setCheckOut] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(12, 0, 0, 0);
    return localDateTimeValue(date);
  });
  const [submitting, setSubmitting] = useState(false);
  const [priceQuote, setPriceQuote] = useState<Awaited<ReturnType<typeof frontDeskApi.roomPriceQuote>> | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [submitStep, setSubmitStep] = useState<"guest" | "booking">("booking");
  const [error, setError] = useState<string | null>(null);
  const bookingIdempotencyKey = useMemo(() => newFrontDeskIdempotencyKey(), [selectedGuest?.id, newGuestMode, newGuestName, newGuestIdentity, newGuestPhone, newGuestEmail, roomId, checkIn, checkOut]);

  useEffect(() => {
    const id = roomId.trim();
    if (!id || !checkIn || !checkOut || new Date(checkOut).getTime() <= new Date(checkIn).getTime()) {
      setPriceQuote(null);
      setQuoteLoading(false);
      setQuoteError(null);
      return;
    }
    let active = true;
    setQuoteLoading(true);
    setQuoteError(null);
    const timer = window.setTimeout(() => {
      void frontDeskApi.roomPriceQuote(id, checkIn, checkOut)
        .then(quote => { if (active) setPriceQuote(quote); })
        .catch(error => { if (active) { setPriceQuote(null); setQuoteError(apiErrorText(error)); } })
        .finally(() => { if (active) setQuoteLoading(false); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [roomId, checkIn, checkOut]);

  useEffect(() => {
    const query = guestSearch.trim();
    if (selectedGuest || newGuestMode || query.length < 2) {
      setGuestMatches([]);
      setSearchingGuests(false);
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      setSearchingGuests(true);
      void frontDeskApi.guests(query)
        .then(results => { if (active) setGuestMatches(results.slice(0, 8)); })
        .catch(() => { if (active) setGuestMatches([]); })
        .finally(() => { if (active) setSearchingGuests(false); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [guestSearch, newGuestMode, selectedGuest]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!actorId) { setError("Chưa tải được nhân viên đang đăng nhập. Vui lòng tải lại hoặc đăng nhập lại."); return; }
    if (!selectedGuest && !newGuestMode) { setError("Vui lòng tìm và chọn khách hàng, hoặc thêm hồ sơ khách mới."); return; }
    if (!selectedGuest && (!newGuestName.trim() || !newGuestIdentity.trim() || !newGuestPhone.trim())) {
      setError("Vui lòng nhập họ tên, CCCD/hộ chiếu và số điện thoại của khách."); return;
    }
    if (!selectedGuest && !/^[0-9+ .-]{8,15}$/.test(newGuestPhone.trim())) {
      setError("Số điện thoại cần có 8–15 ký tự và dùng chữ số hoặc dấu +, dấu chấm, dấu gạch ngang."); return;
    }
    if (!selectedGuest && newGuestIdentity.trim().length > 12) {
      setError("CCCD/hộ chiếu không được dài quá 12 ký tự."); return;
    }
    if (!roomId.trim()) { setError("Vui lòng nhập số phòng."); return; }
    if (new Date(checkOut).getTime() <= new Date(checkIn).getTime()) { setError("Thời gian trả phòng phải sau thời gian nhận phòng."); return; }

    setSubmitting(true);
    setError(null);
    try {
      let guest = selectedGuest;
      if (!guest) {
        setSubmitStep("guest");
        guest = await frontDeskApi.createGuest({
          full_name: newGuestName.trim(),
          identity_number: newGuestIdentity.trim(),
          phone: newGuestPhone.trim(),
          email: newGuestEmail.trim() || undefined,
        });
        // Keep the created profile selected if reservation creation needs to be retried.
        setSelectedGuest(guest);
        setGuestSearch(guest.full_name);
        setNewGuestMode(false);
      }
      setSubmitStep("booking");
      const reservation = await frontDeskApi.createReservation({
        guest_id: guest.id,
        employee_id: actorId,
        rental_type: "PACKAGE",
        idempotency_key: bookingIdempotencyKey,
        rooms: [{ room_id: roomId.trim(), expected_check_in: checkIn, expected_check_out: checkOut }],
      });
      onCreated(reservation);
    } catch (submitError) {
      setError(apiErrorText(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div role="dialog" aria-label="Tạo đặt phòng tại quầy" aria-modal="true" style={{ position:"fixed",inset:0,background:"rgba(15,23,42,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,padding:20 }}>
      <div style={{ background:"#FFF",borderRadius:14,width:"100%",maxWidth:540,maxHeight:"calc(100vh - 32px)",overflowY:"auto",boxShadow:"0 20px 25px -5px rgba(0,0,0,.2)" }}>
        <div style={{ padding:"16px 20px",borderBottom:"1px solid #E2E8F0",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div>
            <h3 style={{ fontSize:16,fontWeight:700,color:"#0F172A" }}>Đặt phòng tại quầy</h3>
            <p style={{ fontSize:12,color:"#64748B",marginTop:3 }}>Lễ tân tạo lượt lưu trú cho khách tại quầy</p>
            {initialRoom && <p style={{ fontSize:11,color:"#64748B",marginTop:3 }}>Đã chọn phòng {initialRoom.number} · {roomTypeLabel(initialRoom.type)}</p>}
          </div>
          <button type="button" aria-label="Đóng đặt phòng" onClick={onClose} style={{ cursor:"pointer",color:"#94A3B8" }}><X size={18} /></button>
        </div>
        <form aria-label="Tạo đặt phòng tại quầy" onSubmit={submit} style={{ padding:20,display:"flex",flexDirection:"column",gap:12 }}>
          {error && <div role="alert" style={{padding:"10px 12px",borderRadius:8,background:"#FFF1F2",color:"#BE123C",fontSize:12}}>{error}</div>}
          <div>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:5 }}>
              <label htmlFor="counter-booking-guest" style={{ fontSize:12,fontWeight:600,color:"#334155" }}>Khách hàng *</label>
              {!newGuestMode && !selectedGuest && <button type="button" onClick={()=>{setNewGuestMode(true);setGuestMatches([]);setError(null);}} style={{ border:0,background:"transparent",color:"#2563EB",fontSize:12,fontWeight:600,cursor:"pointer" }}>+ Khách chưa có hồ sơ</button>}
            </div>
            {selectedGuest ? (
              <div style={{ border:"1px solid #86EFAC",background:"#F0FDF4",borderRadius:8,padding:"10px 12px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10 }}>
                <div style={{ minWidth:0 }}>
                  <p style={{ fontSize:13,fontWeight:700,color:"#166534" }}>{selectedGuest.full_name}</p>
                  <p style={{ fontSize:11,color:"#475569",marginTop:3 }}>CCCD/Hộ chiếu: {selectedGuest.identity_number} · {selectedGuest.phone}</p>
                </div>
                <button type="button" onClick={()=>{setSelectedGuest(null);setGuestSearch("");setError(null);}} style={{ flexShrink:0,border:"1px solid #BBF7D0",background:"#FFF",borderRadius:6,padding:"6px 9px",fontSize:11,color:"#166534",cursor:"pointer" }}>Đổi khách</button>
              </div>
            ) : newGuestMode ? (
              <div style={{ border:"1px solid #CBD5E1",borderRadius:8,padding:12,display:"flex",flexDirection:"column",gap:9 }}>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                  <p style={{ fontSize:12,fontWeight:700,color:"#334155" }}>Tạo hồ sơ khách mới</p>
                  <button type="button" onClick={()=>{setNewGuestMode(false);setError(null);}} style={{ border:0,background:"transparent",color:"#64748B",fontSize:11,cursor:"pointer" }}>Quay lại tìm khách</button>
                </div>
                <label style={{ fontSize:11,fontWeight:600,color:"#475569" }}>Họ và tên *
                  <input required maxLength={160} value={newGuestName} onChange={event=>setNewGuestName(event.target.value)} placeholder="Ví dụ: Nguyễn Văn An" style={{ width:"100%",height:36,border:"1px solid #CBD5E1",borderRadius:7,padding:"0 10px",fontSize:13,marginTop:4,boxSizing:"border-box" }} />
                </label>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:9 }}>
                  <label style={{ fontSize:11,fontWeight:600,color:"#475569" }}>CCCD hoặc hộ chiếu *
                    <input required maxLength={12} value={newGuestIdentity} onChange={event=>setNewGuestIdentity(event.target.value)} placeholder="Số giấy tờ tùy thân" style={{ width:"100%",height:36,border:"1px solid #CBD5E1",borderRadius:7,padding:"0 10px",fontSize:13,marginTop:4,boxSizing:"border-box" }} />
                  </label>
                  <label style={{ fontSize:11,fontWeight:600,color:"#475569" }}>Số điện thoại *
                    <input required maxLength={15} value={newGuestPhone} onChange={event=>setNewGuestPhone(event.target.value)} placeholder="Ví dụ: 0901234567" style={{ width:"100%",height:36,border:"1px solid #CBD5E1",borderRadius:7,padding:"0 10px",fontSize:13,marginTop:4,boxSizing:"border-box" }} />
                  </label>
                </div>
                <label style={{ fontSize:11,fontWeight:600,color:"#475569" }}>Email (không bắt buộc)
                  <input type="email" maxLength={254} value={newGuestEmail} onChange={event=>setNewGuestEmail(event.target.value)} placeholder="ten@email.com" style={{ width:"100%",height:36,border:"1px solid #CBD5E1",borderRadius:7,padding:"0 10px",fontSize:13,marginTop:4,boxSizing:"border-box" }} />
                </label>
              </div>
            ) : (
              <>
                <input id="counter-booking-guest" autoComplete="off" value={guestSearch} onChange={event=>{setGuestSearch(event.target.value);setError(null);}} placeholder="Tìm theo tên, số điện thoại hoặc CCCD/hộ chiếu" style={{ width:"100%",height:38,border:"1px solid #CBD5E1",borderRadius:8,padding:"0 11px",fontSize:13,boxSizing:"border-box" }} />
                {guestSearch.trim().length >= 2 && <div style={{ marginTop:5,border:"1px solid #E2E8F0",borderRadius:8,overflow:"hidden" }}>
                  {searchingGuests ? <p style={{ padding:10,fontSize:12,color:"#64748B" }}>Đang tìm khách…</p>
                    : guestMatches.length ? guestMatches.map(guest=><button key={guest.id} type="button" onClick={()=>{setSelectedGuest(guest);setGuestSearch(guest.full_name);setGuestMatches([]);setError(null);}} style={{ display:"block",width:"100%",textAlign:"left",padding:"9px 11px",border:0,borderBottom:"1px solid #F1F5F9",background:"#FFF",cursor:"pointer" }}>
                      <span style={{ display:"block",fontSize:12,fontWeight:700,color:"#0F172A" }}>{guest.full_name}</span>
                      <span style={{ display:"block",fontSize:11,color:"#64748B",marginTop:2 }}>{guest.identity_number} · {guest.phone}</span>
                    </button>)
                    : <p style={{ padding:10,fontSize:12,color:"#64748B" }}>Chưa tìm thấy hồ sơ phù hợp. Có thể thêm khách mới ngay tại đây.</p>}
                </div>}
                <p style={{ fontSize:11,color:"#64748B",marginTop:5 }}>Khách vãng lai chưa có hồ sơ? Chọn “Khách chưa có hồ sơ” để nhập thông tin.</p>
              </>
            )}
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10 }}>
            <label style={{ fontSize:12,fontWeight:600,color:"#334155" }}>
              Mã số phòng *
              <input required value={roomId} onChange={event=>setRoomId(event.target.value)} placeholder="Ví dụ: 101 hoặc R-101"
                style={{ width:"100%",height:36,border:"1px solid #CBD5E1",borderRadius:7,padding:"0 10px",fontSize:13,marginTop:4,boxSizing:"border-box" }} />
            </label>
          </div>
          <div aria-live="polite" style={{ border:"1px solid #DBEAFE",background:"#F8FAFC",borderRadius:8,padding:"10px 12px",fontSize:12,color:"#475569",lineHeight:1.6 }}>
            {quoteLoading ? <span>Đang tính tiền phòng…</span>
              : priceQuote ? <>
                <div style={{ display:"flex",justifyContent:"space-between",gap:8 }}><span>{priceQuote.room_type_name} · {formatVnd(priceQuote.daily_price)}/đêm × {priceQuote.nights} đêm</span><strong style={{ color:"#0F172A" }}>{formatVnd(priceQuote.estimated_total)}</strong></div>
                <div style={{ marginTop:3,fontSize:11,color:"#64748B" }}>Tiền phòng dự kiến, chưa gồm dịch vụ hoặc phụ thu.</div>
              </>
              : quoteError ? <span style={{ color:"#B45309" }}>{quoteError}</span>
                : !roomId.trim() ? <span>Nhập số phòng để xem trước tiền phòng.</span>
                  : new Date(checkOut).getTime() <= new Date(checkIn).getTime() ? <span>Chọn thời gian trả phòng sau thời gian nhận phòng để xem giá.</span>
                    : <span>Chưa có báo giá cho phòng này.</span>}
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10 }}>
            <label style={{ fontSize:12,fontWeight:600,color:"#334155" }}>
              Thời gian nhận phòng *
              <input required type="datetime-local" value={checkIn} onChange={event=>setCheckIn(event.target.value)}
                style={{ width:"100%",height:36,border:"1px solid #CBD5E1",borderRadius:7,padding:"0 10px",fontSize:12,marginTop:4,boxSizing:"border-box" }} />
            </label>
            <label style={{ fontSize:12,fontWeight:600,color:"#334155" }}>
              Thời gian trả phòng *
              <input required type="datetime-local" value={checkOut} onChange={event=>setCheckOut(event.target.value)}
                style={{ width:"100%",height:36,border:"1px solid #CBD5E1",borderRadius:7,padding:"0 10px",fontSize:12,marginTop:4,boxSizing:"border-box" }} />
            </label>
          </div>
          <div style={{ display:"flex",justifyContent:"flex-end",gap:8,marginTop:8 }}>
            <button type="button" onClick={onClose} style={{ padding:"8px 14px",borderRadius:7,border:"1px solid #E2E8F0",fontSize:12,fontWeight:600,color:"#64748B",cursor:"pointer" }}>Hủy</button>
            <button type="submit" disabled={submitting} style={{ padding:"8px 18px",borderRadius:7,background:submitting?"#94A3B8":"#16A34A",color:"#FFF",fontSize:12,fontWeight:700,cursor:submitting?"not-allowed":"pointer" }}>
              {submitting ? (submitStep === "guest" ? "Đang tạo hồ sơ khách…" : "Đang tạo lượt lưu trú…") : "Tạo lượt lưu trú"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

