import { ServicesPanel } from "./ServicesPanel";
import type { Room as ApiRoom } from "../../shared/types/housekeepingTechnical";
import type { HKStatus, NavPage, HKRoom } from "./types";
import { useEffect, useState, useMemo } from "react";
import { housekeepingTechnicalApi } from "../../shared/api/housekeepingTechnical";
import { authApi } from "../../shared/api/auth";
import { apiErrorMessage } from "../../shared/api/client";
import { employeeRoleLabel } from "../../shared/types/api";
import type { EmployeeProfileDto } from "../../shared/types/api";
import { EmployeeProfileDropdown } from "../../shared/components/EmployeeProfileDropdown";
import { Home, LayoutGrid, Search, ChevronDown, X, Clock, AlertTriangle, CheckCircle2, Minus, Plus, BedDouble, Sparkles, LogOut, CheckSquare, Square, MoreHorizontal, RefreshCcw, Wine } from "lucide-react";

/* ══════════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════════ */

const roomTypeLabel = (type: string) => ({
  Standard: "Tiêu chuẩn", Deluxe: "Cao cấp", Suite: "Suite", "VIP Suite": "Suite VIP",
  "Deluxe giường King": "Deluxe giường King", "Superior hai giường": "Superior hai giường",
}[type] ?? type);

/* ══════════════════════════════════════════════════════════
   CONFIG
══════════════════════════════════════════════════════════ */
const STATUS_CFG = {
  "to-clean":   { label:"Cần dọn",       dot:"#F59E0B", bg:"#FEF9C3", text:"#92400E" },
  "in-progress":{ label:"Đang vệ sinh",  dot:"#3B82F6", bg:"#DBEAFE", text:"#1D4ED8" },
  "inspecting": { label:"Đang kiểm tra", dot:"#8B5CF6", bg:"#EDE9FE", text:"#6D28D9" },
  "ready":      { label:"Sẵn sàng",      dot:"#16A34A", bg:"#DCFCE7", text:"#166534" },
};
const SUB_CFG = {
  "checkout-dirty":{ label:"Phòng trả khách cần dọn", bg:"#FEF3C7", text:"#92400E" },
  "stayover":      { label:"Khách đang ở",        bg:"#F1F5F9", text:"#475569" },
  "vip-arrival":   { label:"Khách VIP sắp đến",     bg:"#DCFCE7", text:"#166534" },
  "maintenance":   { label:"Bảo trì",         bg:"#FFE4E6", text:"#BE123C" },
};
const PRI_CFG = {
  high:  { label:"Cao",    bg:"#FFE4E6",text:"#BE123C",dot:"#F43F5E" },
  medium:{ label:"Trung bình",bg:"#FEF9C3",text:"#92400E",dot:"#F59E0B" },
  low:   { label:"Thấp",   bg:"#F0FDF4",text:"#166534",dot:"#22C55E" },
};
const INC_STATUS_CFG = {
  open:       { label:"Mới",         bg:"#FFE4E6",text:"#BE123C" },
  "in-progress":{ label:"Đang xử lý",bg:"#DBEAFE",text:"#1D4ED8" },
  resolved:   { label:"Hoàn thành",  bg:"#DCFCE7",text:"#166534" },
};

/* ══════════════════════════════════════════════════════════
   ROOM CARD (Kanban)
══════════════════════════════════════════════════════════ */
function HKRoomCard({ room, onClick, staffInfo }: { room: HKRoom; onClick: () => void; staffInfo?: { name: string; shortName: string; color: string } }) {
  const [hov, setHov] = useState(false);
  const done      = room.checklist.filter(c => c.done).length;
  const total     = room.checklist.length;
  const subCfg    = SUB_CFG[room.subType] ?? SUB_CFG["checkout-dirty"];
  const stCfg     = STATUS_CFG[room.status] ?? STATUS_CFG["to-clean"];

  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background:"#FFF",borderRadius:10,padding:"12px 14px",cursor:"pointer",
        border:`1px solid ${hov?"#CBD5E1":"#E2E8F0"}`,
        boxShadow:hov?"0 3px 10px rgba(0,0,0,.08)":"0 1px 3px rgba(0,0,0,.04)",
        transition:"box-shadow .12s,border-color .12s" }}>
      {/* Header */}
      <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:8 }}>
        <div>
          <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:2 }}>
            <span style={{ fontSize:18,fontWeight:800,color:"#0F172A" }}>{room.number}</span>
            {room.isVip && (
              <span style={{ fontSize:10,fontWeight:700,background:"#FEF9C3",color:"#92400E",
                padding:"1px 6px",borderRadius:4 }}>VIP</span>
            )}
          </div>
          <p style={{ fontSize:11,color:"#64748B" }}>{roomTypeLabel(room.type)}</p>
        </div>
        {staffInfo ? (
          <div style={{ width:28,height:28,borderRadius:99,flexShrink:0,
            background:staffInfo.color,display:"flex",alignItems:"center",
            justifyContent:"center",fontSize:10,fontWeight:700,color:"#FFF" }}
            title={staffInfo.name}>
            {staffInfo.shortName.charAt(0)}
          </div>
        ) : (
          <button onClick={e=>e.stopPropagation()} style={{ color:"#CBD5E1",cursor:"pointer",background:"transparent",border:"none" }}>
            <MoreHorizontal size={14} />
          </button>
        )}
      </div>

      {/* Sub-type badge */}
      <span style={{ display:"inline-flex",alignItems:"center",fontSize:11,fontWeight:600,
        padding:"2px 8px",borderRadius:99,background:subCfg.bg,color:subCfg.text,marginBottom:10 }}>
        {subCfg.label}
      </span>
      <span style={{ display:"inline-flex",alignItems:"center",fontSize:11,fontWeight:700,
        padding:"2px 8px",borderRadius:99,background:stCfg.bg,color:stCfg.text,marginBottom:10,marginLeft:6 }}>
        {stCfg.label}
      </span>

      {/* Progress if in-progress or inspecting */}
      {(room.status === "in-progress" || room.status === "inspecting") && total > 0 && (
        <div style={{ marginBottom:8 }}>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:3 }}>
            <span style={{ fontSize:11,color:"#64748B" }}>{done}/{total} hạng mục</span>
          </div>
          <div style={{ height:4,background:"#E2E8F0",borderRadius:99,overflow:"hidden" }}>
            <div style={{ height:"100%",background:"#3B82F6",
              width:`${(done/total)*100}%`,borderRadius:99,transition:"width .3s" }} />
          </div>
        </div>
      )}

      {/* Task info rows */}
      <div style={{ display:"flex",flexDirection:"column",gap:4 }}>
        {room.status === "to-clean" && (
          <div style={{ display:"flex",alignItems:"center",gap:6 }}>
            <BedDouble size={11} style={{ color:"#94A3B8",flexShrink:0 }} />
            <span style={{ fontSize:11,color:"#64748B" }}>
              {room.subType === "checkout-dirty" ? "Cần thay ga" : "Thay khăn tắm"}
            </span>
          </div>
        )}
        <div style={{ display:"flex",alignItems:"center",gap:6 }}>
          <Sparkles size={11} style={{ color:"#94A3B8",flexShrink:0 }} />
          <span style={{ fontSize:11,color:"#64748B" }}>
            Minibar:{" "}
            {room.status === "in-progress"
              ? (done >= 2 ? "Đã kiểm tra" : "Đang kiểm tra")
              : room.status === "to-clean" ? "Chưa kiểm tra"
              : "Đạt"}
          </span>
        </div>
        {(room.estMin && (room.status === "to-clean" || room.status === "in-progress")) && (
          <div style={{ display:"flex",alignItems:"center",gap:6 }}>
            <Clock size={11} style={{ color:"#94A3B8",flexShrink:0 }} />
            <span style={{ fontSize:11,color:"#64748B" }}>
              {room.status === "in-progress" ? `~${room.estMin} phút nữa` : `${room.estMin} phút`}
            </span>
          </div>
        )}
        {room.doneMin !== undefined && room.status !== "in-progress" && (
          <div style={{ display:"flex",alignItems:"center",gap:6 }}>
            <Clock size={11} style={{ color:"#16A34A",flexShrink:0 }} />
            <span style={{ fontSize:11,color:"#16A34A" }}>
              Trước {room.doneMin} phút
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ROOM DETAIL MODAL
══════════════════════════════════════════════════════════ */
function RoomModal({
  room: initRoom,
  onClose,
  onStartClean,
  onComplete,
  staffInfo,
  currentUser,
}: {
  room: HKRoom;
  onClose: () => void;
  onStartClean?: (room: HKRoom) => void;
  onComplete?: (room: HKRoom) => void;
  staffInfo?: { name: string; shortName: string; color: string };
  currentUser?: EmployeeProfileDto | null;
}) {
  const [room, setRoom] = useState(initRoom);
  const done   = room.checklist.filter(c => c.done).length;
  const total  = room.checklist.length;
  const canComplete = done === total;
  const stCfg  = STATUS_CFG[room.status] ?? STATUS_CFG["to-clean"];

  const toggleCheck = (id: string) =>
    setRoom(r => ({ ...r, checklist: r.checklist.map(c => c.id===id?{...c,done:!c.done}:c) }));

  const adjustMinibar = (i: number, delta: number) =>
    setRoom(r => {
      const mb = [...r.minibar];
      mb[i] = { ...mb[i], count: Math.max(0, mb[i].count + delta) };
      return { ...r, minibar: mb };
    });

  const staffDisplayName = staffInfo?.name ?? (currentUser?.full_name ? currentUser.full_name : (room.staffId ? `Nhân viên ${room.staffId}` : "Chưa phân công"));
  const staffInitial = staffDisplayName.charAt(0).toUpperCase();

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.5)",
      display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:20 }}>
      <div style={{ background:"#FFF",borderRadius:16,width:"100%",maxWidth:560,
        maxHeight:"90vh",overflow:"hidden",display:"flex",flexDirection:"column",
        boxShadow:"0 20px 60px rgba(0,0,0,.25)" }}>

        {/* Modal header */}
        <div style={{ padding:"20px 24px 16px",borderBottom:"1px solid #E2E8F0",flexShrink:0 }}>
          <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12 }}>
            <div>
              <h2 style={{ fontSize:20,fontWeight:800,color:"#0F172A",marginBottom:4 }}>
                Phòng {room.number}{room.isVip?" VIP":""} – {roomTypeLabel(room.type)}
              </h2>
              <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                <span style={{ display:"inline-flex",alignItems:"center",gap:5,
                  fontSize:12,fontWeight:600,padding:"3px 10px",borderRadius:99,
                  background:stCfg.bg,color:stCfg.text }}>
                  <span style={{ width:7,height:7,borderRadius:99,background:stCfg.dot }} />
                  {stCfg.label}
                </span>
                {room.estMin && room.status === "in-progress" && (
                  <span style={{ display:"flex",alignItems:"center",gap:4,
                    fontSize:12,color:"#64748B" }}>
                    <Clock size={12} /> ~{room.estMin} phút nữa
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose}
              style={{ width:32,height:32,borderRadius:8,background:"#F8FAFC",
                border:"1px solid #E2E8F0",display:"flex",alignItems:"center",
                justifyContent:"center",cursor:"pointer",flexShrink:0 }}>
              <X size={15} style={{ color:"#64748B" }} />
            </button>
          </div>

          {/* Staff info */}
          <div style={{ display:"flex",alignItems:"center",gap:20,padding:"10px 14px",
            background:"#F8FAFC",borderRadius:10,border:"1px solid #E2E8F0" }}>
            <div style={{ display:"flex",alignItems:"center",gap:10 }}>
              <div style={{ width:40,height:40,borderRadius:99,background:staffInfo?.color ?? "#16A34A",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:14,fontWeight:700,color:"#FFF",flexShrink:0 }}>
                {staffInitial}
              </div>
              <div>
                <p style={{ fontSize:13,fontWeight:700,color:"#0F172A",margin:0 }}>{staffDisplayName}</p>
                <p style={{ fontSize:11,color:"#64748B",margin:"2px 0 0" }}>Nhân viên phụ trách</p>
              </div>
            </div>
            <div style={{ marginLeft:"auto",display:"flex",gap:20 }}>
              <div>
                <p style={{ fontSize:10,color:"#94A3B8",textTransform:"uppercase",letterSpacing:"0.06em",margin:0 }}>Vị trí</p>
                <p style={{ fontSize:12,fontWeight:600,color:"#0F172A",margin:"2px 0 0" }}>Tầng {room.floor}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex:1,overflowY:"auto",padding:"20px 24px" }}>
          {/* 1. Linen checklist */}
          <div style={{ marginBottom:24 }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12 }}>
              <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                <div style={{ width:26,height:26,borderRadius:99,background:"#DBEAFE",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:12,fontWeight:700,color:"#1D4ED8" }}>1</div>
                <h3 style={{ fontSize:14,fontWeight:700,color:"#0F172A",margin:0 }}>Checklist đồ vải &amp; Vệ sinh</h3>
              </div>
              {total > 0 && (
                <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                  <span style={{ fontSize:12,color:"#64748B" }}>{done}/{total} hoàn thành</span>
                  <div style={{ width:80,height:6,background:"#E2E8F0",borderRadius:99,overflow:"hidden" }}>
                    <div style={{ height:"100%",background:"#16A34A",
                      width:`${(done/total)*100}%`,borderRadius:99 }} />
                  </div>
                </div>
              )}
            </div>

            {total === 0 ? (
              <p style={{ fontSize:12,color:"#94A3B8",fontStyle:"italic",padding:"8px 0" }}>
                Checklist không thuộc phạm vi vận hành hiện tại.
              </p>
            ) : (
              <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                {room.checklist.map(item => (
                  <div key={item.id}
                    onClick={() => toggleCheck(item.id)}
                    style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 12px",
                      borderRadius:8,border:"1px solid #E2E8F0",cursor:"pointer",
                      background:item.done?"#F0FDF4":"#FFF",transition:"background .12s" }}>
                    {item.done
                      ? <CheckSquare size={16} style={{ color:"#16A34A",flexShrink:0 }} />
                      : <Square     size={16} style={{ color:"#CBD5E1",flexShrink:0 }} />}
                    <span style={{ fontSize:13,color:item.done?"#166534":"#334155" }}>{item.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Minibar audit */}
          <div style={{ marginBottom:24 }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12 }}>
              <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                <div style={{ width:26,height:26,borderRadius:99,background:"#DBEAFE",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:12,fontWeight:700,color:"#1D4ED8" }}>2</div>
                <h3 style={{ fontSize:14,fontWeight:700,color:"#0F172A",margin:0 }}>Kiểm kê minibar</h3>
              </div>
            </div>

            {room.minibar.length === 0 ? (
              <p style={{ fontSize:12,color:"#94A3B8",fontStyle:"italic",padding:"8px 0" }}>
                Không có dữ liệu minibar ghi nhận cho phòng này.
              </p>
            ) : (
              <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                {room.minibar.map((mb, i) => (
                  <div key={i} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",
                    padding:"8px 12px",borderRadius:8,border:"1px solid #E2E8F0",background:"#F8FAFC" }}>
                    <span style={{ fontSize:13,color:"#334155" }}>{mb.item}</span>
                    <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                      <button onClick={() => adjustMinibar(i, -1)}
                        style={{ width:24,height:24,borderRadius:6,border:"1px solid #CBD5E1",background:"#FFF",
                          cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
                        <Minus size={12} style={{ color:"#475569" }} />
                      </button>
                      <span style={{ fontSize:13,fontWeight:700,minWidth:24,textAlign:"center",fontFamily:"'JetBrains Mono',monospace" }}>
                        {mb.count}
                      </span>
                      <button onClick={() => adjustMinibar(i, 1)}
                        style={{ width:24,height:24,borderRadius:6,border:"1px solid #CBD5E1",background:"#FFF",
                          cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
                        <Plus size={12} style={{ color:"#475569" }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Footer buttons */}
        <div style={{ padding:"16px 24px",borderTop:"1px solid #E2E8F0",
          display:"flex",gap:10,flexShrink:0,alignItems:"center" }}>
          <button onClick={onClose}
            style={{ padding:"12px 16px",borderRadius:9,border:"1px solid #CBD5E1",
              background:"#FFF",color:"#475569",fontSize:13,fontWeight:600,cursor:"pointer" }}>
            Hủy / Đóng
          </button>

          {/* Only show "Bắt đầu dọn" when room is to-clean */}
          {room.status === "to-clean" && (
            <button onClick={() => { onStartClean?.(room); onClose(); }}
              style={{ flex:1,padding:"12px",borderRadius:9,border:"1px solid #3B82F6",
                background:"#EFF6FF",color:"#1D4ED8",fontSize:13,fontWeight:700,cursor:"pointer",
                display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}>
              <RefreshCcw size={15} /> Bắt đầu dọn phòng
            </button>
          )}

          {/* Only show "Hoàn tất vệ sinh" when room is in-progress */}
          {room.status === "in-progress" && (
            <button disabled={!canComplete} title={!canComplete ? `Cần hoàn thành checklist (${done}/${total})` : undefined} onClick={() => { onComplete?.(room); onClose(); }}
              style={{ flex:2,padding:"12px",borderRadius:9,
                background:"#16A34A",color:"#FFF",fontSize:13,fontWeight:700,cursor:"pointer",
                display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                boxShadow:"0 2px 8px rgba(22,163,74,.3)" }}>
              <CheckCircle2 size={16} /> {!canComplete ? `Cần hoàn thành checklist (${done}/${total})` : "Hoàn tất vệ sinh & Bàn giao"}
            </button>
          )}

          {/* When inspecting */}
          {room.status === "inspecting" && (
            <div style={{ flex: 2, display: "flex", gap: 8 }}>

              <div
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: 9,
                  background: "#EDE9FE",
                  color: "#6D28D9",
                  fontSize: 13,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Clock size={16} /> Đang chờ nghiệm thu
              </div>
            </div>
          )}

          {/* When ready */}
          {room.status === "ready" && (
            <div style={{ flex:2,padding:"12px",borderRadius:9,
              background:"#DCFCE7",color:"#166534",fontSize:13,fontWeight:700,
              display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
              <CheckCircle2 size={16} /> Phòng đã sẵn sàng đón khách
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   OVERVIEW SCREEN
══════════════════════════════════════════════════════════ */
function OverviewScreen({
  rooms = [],
  search = "",
  onStartClean,
  onComplete,
  currentUser,
}: {
  rooms?: HKRoom[];
  search?: string;
  onStartClean?: (room: HKRoom) => void;
  onComplete?: (room: HKRoom) => void;
  currentUser?: EmployeeProfileDto | null;
}) {
  const [modal, setModal] = useState<HKRoom|null>(null);
  const [filter, setFilter] = useState<"all"|HKStatus>("all");

  const searchFilteredRooms = useMemo(() => {
    if (!search.trim()) return rooms;
    const q = search.trim().toLowerCase();
    return rooms.filter(r =>
      r.number.toLowerCase().includes(q) ||
      r.type.toLowerCase().includes(q) ||
      (r.notes && r.notes.toLowerCase().includes(q))
    );
  }, [rooms, search]);

  const currentEmpId = currentUser?.employee_id;
  const myRooms = useMemo(() => {
    if (!currentEmpId) return searchFilteredRooms;
    return searchFilteredRooms.filter(r => r.staffId === currentEmpId || !r.staffId);
  }, [searchFilteredRooms, currentEmpId]);

  const myDone = myRooms.filter(r => r.status === "ready").length;
  const myInspecting = myRooms.filter(r => r.status === "inspecting").length;
  const myInProgress = myRooms.filter(r => r.status === "in-progress").length;
  const myToClean = myRooms.filter(r => r.status === "to-clean").length;
  const myPct = myRooms.length > 0 ? Math.round(((myDone + myInspecting) / myRooms.length) * 100) : 0;

  const filteredMyRooms = useMemo(() => {
    if (filter === "all") return myRooms;
    return myRooms.filter(r => r.status === filter);
  }, [myRooms, filter]);

  // Derive floors from actual rooms
  const floors = useMemo(() => {
    const list = [...new Set(searchFilteredRooms.map(r => r.floor))].sort((a,b) => a-b);
    return list.length > 0 ? list : [1];
  }, [searchFilteredRooms]);

  // Derive recent activity from rooms & incidents
  const recentActivities = useMemo(() => {
    const act: { time: string; msg: string; col: string }[] = [];
    searchFilteredRooms.forEach(r => {
      if (r.status === "ready") {
        act.push({ time: "Hoàn tất", msg: `Phòng ${r.number} đã nghiệm thu đạt chuẩn`, col: "#16A34A" });
      } else if (r.status === "inspecting") {
        act.push({ time: "Chờ duyệt", msg: `Phòng ${r.number} hoàn thành dọn — chờ kiểm tra`, col: "#8B5CF6" });
      } else if (r.status === "in-progress") {
        act.push({ time: "Đang dọn", msg: `Phòng ${r.number} đang được vệ sinh`, col: "#3B82F6" });
      }
    });
    return act.slice(0, 6);
  }, [searchFilteredRooms]);

  return (
    <div style={{ flex:1,overflowY:"auto",background:"#F8FAFC" }}>
      <div style={{ padding:"20px 24px" }}>
        <div style={{ marginBottom:16 }}>
          <h2 style={{ fontSize:18,fontWeight:700,color:"#0F172A",marginBottom:2 }}>Tổng quan ca làm</h2>
          <p style={{ fontSize:12,color:"#94A3B8" }}>
            Trực ca vận hành · Bàn giao &amp; Nghiệm thu phòng buồng
          </p>
        </div>

        {/* My Shift Tasks & Assigned Rooms */}
        <div style={{ background:"#FFF",borderRadius:14,border:"1px solid #E2E8F0",padding:"18px 20px",marginBottom:20,boxShadow:"0 1px 3px rgba(0,0,0,.03)" }}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12,marginBottom:16,paddingBottom:14,borderBottom:"1px solid #F1F5F9" }}>
            <div style={{ display:"flex",alignItems:"center",gap:12 }}>
              <div style={{ width:44,height:44,borderRadius:12,background:"linear-gradient(135deg,#16A34A,#15803D)",display:"flex",alignItems:"center",justifyContent:"center",color:"#FFF",fontWeight:800,fontSize:16,boxShadow:"0 3px 8px rgba(22,163,74,.25)" }}>
                {currentUser?.full_name ? currentUser.full_name.charAt(0).toUpperCase() : "HK"}
              </div>
              <div>
                <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                  <h3 style={{ fontSize:15,fontWeight:700,color:"#0F172A",margin:0 }}>Nhiệm vụ ca trực của tôi</h3>
                  <span style={{ fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:99,background:"#DCFCE7",color:"#166534" }}>
                    {currentUser?.full_name ? `${currentUser.full_name} · ${employeeRoleLabel(currentUser.role)}` : "Nhân viên Buồng phòng"}
                  </span>
                </div>
                <p style={{ fontSize:12,color:"#64748B",marginTop:3,marginBottom:0 }}>
                  Tiếp nhận danh sách phân công từ Quản lý buồng phòng: <strong>{myRooms.length} phòng</strong> được giao
                </p>
              </div>
            </div>

            <div style={{ display:"flex",alignItems:"center",gap:16,background:"#F8FAFC",padding:"8px 16px",borderRadius:10,border:"1px solid #E2E8F0" }}>
              <div>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:4 }}>
                  <span style={{ fontSize:11,color:"#64748B" }}>Tiến độ hoàn thành:</span>
                  <span style={{ fontSize:12,fontWeight:700,color:myPct===100?"#16A34A":"#D97706" }}>{myDone + myInspecting}/{myRooms.length} phòng ({myPct}%)</span>
                </div>
                <div style={{ width:160,height:6,background:"#E2E8F0",borderRadius:99,overflow:"hidden" }}>
                  <div style={{ height:"100%",background:"#16A34A",width:`${myPct}%`,borderRadius:99,transition:"width .3s" }} />
                </div>
              </div>
            </div>
          </div>

          {/* Quick status chips */}
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10,marginBottom:16 }}>
            <div style={{ padding:"12px 14px",borderRadius:10,background:"#FFFBEB",border:"1px solid #FDE68A" }}>
              <p style={{ fontSize:11,color:"#92400E",fontWeight:600,marginBottom:2 }}>CẦN DỌN (CHỜ XỬ LÝ)</p>
              <p style={{ fontSize:20,fontWeight:800,color:"#B45309",margin:0 }}>{myToClean} phòng</p>
              <p style={{ fontSize:11,color:"#B45309",marginTop:2,marginBottom:0 }}>Ưu tiên phòng trả khách &amp; VIP</p>
            </div>
            <div style={{ padding:"12px 14px",borderRadius:10,background:"#EFF6FF",border:"1px solid #BFDBFE" }}>
              <p style={{ fontSize:11,color:"#1D4ED8",fontWeight:600,marginBottom:2 }}>ĐANG DỌN DẸP</p>
              <p style={{ fontSize:20,fontWeight:800,color:"#1D4ED8",margin:0 }}>{myInProgress} phòng</p>
              <p style={{ fontSize:11,color:"#2563EB",marginTop:2,marginBottom:0 }}>Đang thực hiện checklist</p>
            </div>
            <div style={{ padding:"12px 14px",borderRadius:10,background:"#F5F3FF",border:"1px solid #DDD6FE" }}>
              <p style={{ fontSize:11,color:"#6D28D9",fontWeight:600,marginBottom:2 }}>CHỜ NGHIỆM THU</p>
              <p style={{ fontSize:20,fontWeight:800,color:"#6D28D9",margin:0 }}>{myInspecting} phòng</p>
              <p style={{ fontSize:11,color:"#7C3AED",marginTop:2,marginBottom:0 }}>Đã dọn xong, chờ kiểm tra</p>
            </div>
            <div style={{ padding:"12px 14px",borderRadius:10,background:"#F0FDF4",border:"1px solid #BBF7D0" }}>
              <p style={{ fontSize:11,color:"#166534",fontWeight:600,marginBottom:2 }}>ĐÃ SẴN SÀNG</p>
              <p style={{ fontSize:20,fontWeight:800,color:"#166534",margin:0 }}>{myDone} phòng</p>
              <p style={{ fontSize:11,color:"#15803D",marginTop:2,marginBottom:0 }}>Đã nghiệm thu đạt chuẩn</p>
            </div>
          </div>

          {/* Assigned room list header & filter */}
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8,marginBottom:12 }}>
            <p style={{ fontSize:13,fontWeight:700,color:"#0F172A",margin:0 }}>Danh sách phòng được giao trong ca</p>
            <div style={{ display:"flex",gap:4,flexWrap:"wrap" }}>
              {[
                { id:"all", label:`Tất cả (${myRooms.length})` },
                { id:"to-clean", label:`Cần dọn (${myToClean})` },
                { id:"in-progress", label:`Đang dọn (${myInProgress})` },
                { id:"inspecting", label:`Chờ kiểm tra (${myInspecting})` },
                { id:"ready", label:`Sẵn sàng (${myDone})` },
              ].map(t => {
                const active = filter === t.id;
                return (
                  <button key={t.id} onClick={() => setFilter(t.id as any)}
                    style={{ padding:"4px 10px",borderRadius:6,border:`1px solid ${active?"#0F172A":"#E2E8F0"}`,
                      background:active?"#0F172A":"#FFF",color:active?"#FFF":"#475569",fontSize:11,fontWeight:active?600:400,cursor:"pointer" }}>
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Assigned room grid */}
          {filteredMyRooms.length === 0 ? (
            <div style={{ padding:"24px 16px",textAlign:"center",background:"#F8FAFC",border:"1px dashed #CBD5E1",borderRadius:10,color:"#94A3B8",fontSize:12 }}>
              Chưa có dữ liệu phòng trong danh mục này.
            </div>
          ) : (
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:10 }}>
              {filteredMyRooms.map(room => {
                const done = room.checklist.filter(c => c.done).length;
                const total = room.checklist.length;
                const subCfg = SUB_CFG[room.subType] ?? SUB_CFG["checkout-dirty"];
                const stCfg = STATUS_CFG[room.status] ?? STATUS_CFG["to-clean"];
                return (
                  <div key={room.id} onClick={() => setModal(room)}
                    style={{ background:"#F8FAFC",borderRadius:10,border:"1px solid #E2E8F0",padding:"12px 14px",cursor:"pointer",transition:"all .15s",position:"relative" }}>
                    <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:6 }}>
                      <div>
                        <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                          <span style={{ fontSize:16,fontWeight:800,color:"#0F172A" }}>P.{room.number}</span>
                          {room.isVip && (
                            <span style={{ fontSize:10,fontWeight:700,background:"#FEF9C3",color:"#92400E",padding:"1px 6px",borderRadius:4 }}>VIP</span>
                          )}
                          <span style={{ fontSize:11,color:"#64748B" }}>· Tầng {room.floor}</span>
                        </div>
                        <p style={{ fontSize:11,color:"#64748B",margin:"2px 0 0" }}>{roomTypeLabel(room.type)}</p>
                      </div>
                      <span style={{ fontSize:10,fontWeight:600,padding:"2px 7px",borderRadius:99,background:stCfg.bg,color:stCfg.text }}>
                        {stCfg.label}
                      </span>
                    </div>

                    <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:8 }}>
                      <span style={{ fontSize:10,fontWeight:600,padding:"2px 6px",borderRadius:99,background:subCfg.bg,color:subCfg.text }}>
                        {subCfg.label}
                      </span>
                      {room.notes && (
                        <span style={{ fontSize:10,color:"#D97706",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                          ⚠️ {room.notes}
                        </span>
                      )}
                    </div>

                    {/* Checklist summary */}
                    <div style={{ borderTop:"1px solid #EEF2F6",paddingTop:8,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                      <span style={{ fontSize:11,color:"#64748B" }}>Checklist: <strong>{done}/{total}</strong></span>
                      <button onClick={(e) => { e.stopPropagation(); setModal(room); }}
                        style={{ padding:"3px 8px",borderRadius:6,border:"1px solid #CBD5E1",background:"#FFF",color:"#1E293B",fontSize:10,fontWeight:600,cursor:"pointer" }}>
                        {room.status === "to-clean" ? "Dọn phòng →" : room.status === "in-progress" ? "Tiếp tục →" : "Xem phiếu"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Floor summary */}
        <div style={{ marginBottom:16 }}>
          <p style={{ fontSize:13,fontWeight:700,color:"#0F172A",marginBottom:10 }}>Tình trạng theo tầng</p>
          <div style={{ display:"grid",gridTemplateColumns:`repeat(${Math.max(1, Math.min(5, floors.length))},1fr)`,gap:10 }}>
            {floors.map(f => {
              const fRooms   = searchFilteredRooms.filter(r=>r.floor===f);
              const fDone    = fRooms.filter(r=>r.status==="ready").length;
              const fTotal   = fRooms.length;
              return (
                <div key={f} style={{ background:"#FFF",borderRadius:10,border:"1px solid #E2E8F0",
                  padding:"14px",textAlign:"center" }}>
                  <p style={{ fontSize:11,color:"#94A3B8",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.06em" }}>Tầng {f}</p>
                  <p style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:24,fontWeight:800,color:"#0F172A",lineHeight:1,marginBottom:6 }}>{fDone}</p>
                  <p style={{ fontSize:10,color:"#64748B",marginBottom:8 }}>/ {fTotal} phòng sẵn sàng</p>
                  <div style={{ height:4,background:"#E2E8F0",borderRadius:99,overflow:"hidden" }}>
                    <div style={{ height:"100%",background:"#16A34A",
                      width:fTotal>0?`${(fDone/fTotal)*100}%`:"0%",borderRadius:99 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div style={{ background:"#FFF",borderRadius:12,border:"1px solid #E2E8F0",overflow:"hidden" }}>
            <div style={{ padding:"14px 16px",borderBottom:"1px solid #F1F5F9" }}>
              <p style={{ fontSize:13,fontWeight:700,color:"#0F172A",margin:0 }}>Hoạt động gần đây trong ca</p>
            </div>
            {recentActivities.length === 0 ? (
              <div style={{ padding:"20px",textAlign:"center",color:"#94A3B8",fontSize:12 }}>
                Chưa có hoạt động gần đây.
              </div>
            ) : (
              recentActivities.map((a,i,arr) => (
                <div key={i} style={{ display:"flex",alignItems:"flex-start",gap:10,
                  padding:"10px 16px",borderBottom:i<arr.length-1?"1px solid #F8FAFC":"none" }}>
                  <span style={{ width:8,height:8,borderRadius:99,background:a.col,
                    flexShrink:0,marginTop:4 }} />
                  <div>
                    <p style={{ fontSize:12,color:"#334155",margin:0 }}>{a.msg}</p>
                    <p style={{ fontSize:11,color:"#94A3B8",marginTop:2,marginBottom:0 }}>{a.time}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      {modal && (
        <RoomModal
          room={modal}
          onClose={() => setModal(null)}
          onStartClean={onStartClean}
          onComplete={onComplete}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   BOARD SCREEN (Kanban)
══════════════════════════════════════════════════════════ */
const COLUMNS: { id: HKStatus; label: string; color: string; bg: string }[] = [
  { id:"to-clean",    label:"Cần dọn",              color:"#F59E0B",bg:"#FFFBEB" },
  { id:"in-progress", label:"Đang dọn",             color:"#3B82F6",bg:"#EFF6FF" },
  { id:"inspecting",  label:"Đang kiểm tra",        color:"#8B5CF6",bg:"#F5F3FF" },
  { id:"ready",       label:"Sẵn sàng",             color:"#16A34A",bg:"#F0FDF4" },
];

function BoardScreen({
  rooms = [],
  search = "",
  onStartClean,
  onComplete,
  currentUser,
}: {
  rooms?: HKRoom[];
  search?: string;
  onStartClean?: (room: HKRoom) => void;
  onComplete?: (room: HKRoom) => void;
  currentUser?: EmployeeProfileDto | null;
}) {
  const [modal, setModal] = useState<HKRoom|null>(null);
  const [floorFilter, setFloorFilter] = useState<number|"all">("all");
  const [staffFilter, setStaffFilter] = useState<string>("my");

  const floors = useMemo(() => {
    return [...new Set(rooms.map(r => r.floor))].sort((a,b) => a-b);
  }, [rooms]);

  const filtered = useMemo(() => {
    return rooms.filter(r => {
      if (floorFilter !== "all" && r.floor !== floorFilter) return false;
      if (staffFilter === "my" && currentUser?.employee_id) {
        if (r.staffId && r.staffId !== currentUser.employee_id) return false;
      } else if (staffFilter !== "all" && staffFilter !== "my") {
        if (r.staffId !== staffFilter) return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const match = r.number.toLowerCase().includes(q) || r.type.toLowerCase().includes(q) || (r.notes && r.notes.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [floorFilter, staffFilter, search, rooms, currentUser]);

  return (
    <div style={{ flex:1,display:"flex",flexDirection:"column",overflow:"hidden" }}>
      {/* Board toolbar */}
      <div style={{ padding:"10px 20px",borderBottom:"1px solid #E2E8F0",background:"#FFF",
        display:"flex",alignItems:"center",gap:10,flexShrink:0 }}>
        {/* Floor tabs */}
        <div style={{ display:"flex",gap:4 }}>
          {(["all",...floors] as (number|"all")[]).map(f => {
            const active = floorFilter === f;
            return (
              <button key={f} onClick={() => setFloorFilter(f)}
                style={{ padding:"5px 12px",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:active?600:400,
                  background:active?"#0F172A":"#F8FAFC",color:active?"#FFF":"#475569",
                  border:`1px solid ${active?"#0F172A":"#E2E8F0"}` }}>
                {f==="all"?"Tất cả tầng":`Tầng ${f}`}
              </button>
            );
          })}
        </div>
        {/* Staff filter */}
        <div style={{ position:"relative" }}>
          <select value={staffFilter} onChange={e => setStaffFilter(e.target.value)}
            style={{ padding:"5px 28px 5px 10px",borderRadius:7,border:"1px solid #E2E8F0",
              background:"#F8FAFC",fontSize:12,color:"#475569",cursor:"pointer",
              appearance:"none",outline:"none" }}>
            <option value="my">Phòng của tôi ({currentUser?.full_name ?? "Nhân viên"})</option>
            <option value="all">Tất cả phòng trong ca</option>
          </select>
          <ChevronDown size={12} style={{ position:"absolute",right:8,top:"50%",
            transform:"translateY(-50%)",color:"#94A3B8",pointerEvents:"none" }} />
        </div>
      </div>

      {/* Kanban columns */}
      <div style={{ flex:1,overflowX:"auto",padding:"16px 16px 20px",
        display:"flex",gap:12,minWidth:0,background:"#F8FAFC" }}>
        {COLUMNS.map(col => {
          const colRooms = filtered.filter(r => r.status === col.id);
          return (
            <div key={col.id} style={{ width:230,flexShrink:0,display:"flex",flexDirection:"column",gap:8 }}>
              {/* Column header */}
              <div style={{ display:"flex",alignItems:"center",gap:7,
                padding:"9px 12px",borderRadius:8,background:col.bg,
                border:`1px solid ${col.color}22` }}>
                <span style={{ width:8,height:8,borderRadius:99,background:col.color,flexShrink:0 }} />
                <span style={{ fontSize:14,fontWeight:700,color:"#0F172A",flex:1 }}>{col.label}</span>
                <span style={{ fontSize:11,fontWeight:700,background:col.color+"22",
                  color:col.color,padding:"1px 7px",borderRadius:99 }}>{colRooms.length}</span>
              </div>

              {/* Room cards */}
              <div style={{ display:"flex",flexDirection:"column",gap:8,overflowY:"auto",flex:1 }}>
                {colRooms.length === 0 && (
                  <div style={{ textAlign:"center",padding:"24px 8px",color:"#CBD5E1" }}>
                    <BedDouble size={24} style={{ margin:"0 auto 6px",opacity:.3 }} />
                    <p style={{ fontSize:11 }}>Không có phòng</p>
                  </div>
                )}
                {colRooms.map(room => (
                  <HKRoomCard key={room.id} room={room} onClick={() => setModal(room)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {modal && (
        <RoomModal
          room={modal}
          onClose={() => setModal(null)}
          onStartClean={onStartClean}
          onComplete={onComplete}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ROOM INSPECTION
══════════════════════════════════════════════════════════ */
function HKKpiBar({ rooms = [] }: { rooms?: HKRoom[] }) {
  const dirty      = rooms.filter(r => r.status === "to-clean").length;
  const inProgress = rooms.filter(r => r.status === "in-progress").length;
  const inspecting = rooms.filter(r => r.status === "inspecting").length;
  const ready      = rooms.filter(r => r.status === "ready").length;
  return (
    <div style={{ background:"#FFF",borderBottom:"1px solid #E2E8F0",
      display:"flex",flexShrink:0,padding:"0 20px" }}>
      {[
        { label:"Phòng bẩn",         val:dirty,       iconBg:"#FEF9C3",iconColor:"#D97706",Icon:BedDouble },
        { label:"Đang dọn phòng",   val:inProgress,  iconBg:"#DBEAFE",iconColor:"#3B82F6",Icon:RefreshCcw },
        { label:"Đã sẵn sàng",       val:ready,       iconBg:"#DCFCE7",iconColor:"#16A34A",Icon:CheckCircle2 },
      ].map((k,i,arr) => (
        <div key={k.label} style={{ flex:1,padding:"14px 0",display:"flex",alignItems:"center",gap:12,
          borderRight:i<arr.length-1?"1px solid #F1F5F9":"none",
          paddingRight:i<arr.length-1?16:0,paddingLeft:i>0?16:0 }}>
          <div style={{ width:40,height:40,borderRadius:10,background:k.iconBg,flexShrink:0,
            display:"flex",alignItems:"center",justifyContent:"center" }}>
            <k.Icon size={18} style={{ color:k.iconColor }} />
          </div>
          <div>
            <p style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:22,fontWeight:800,color:"#0F172A",lineHeight:1,marginBottom:3 }}>{k.val}</p>
            <p style={{ fontSize:12,fontWeight:600,color:"#334155",margin:0 }}>{k.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function HousekeepingStation({ onBack }: { onBack: () => void }) {
  const [page, setPage]     = useState<NavPage>("overview");
  const [search, setSearch] = useState("");
  const [liveRooms, setLiveRooms] = useState<HKRoom[]>([]);
  const [currentUser, setCurrentUser] = useState<EmployeeProfileDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarProfileOpen, setSidebarProfileOpen] = useState(false);
  const [topProfileOpen, setTopProfileOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [profile, rooms] = await Promise.all([
        authApi.employeeProfile().catch((err: any) => {
          if (err?.status === 401 || err?.status === 403) throw err;
          return null;
        }),
        housekeepingTechnicalApi.rooms(),
      ]);

      if (profile) setCurrentUser(profile);
      const mappedRooms = (rooms || []).flatMap((room: ApiRoom): HKRoom[] => {
        const workflowStatus = room.workflow_status ?? "";
        const isDirty = workflowStatus === "Cần dọn";
        const isCleaning = workflowStatus === "Đang dọn";
        const isReady = workflowStatus === "Sẵn sàng" || (!workflowStatus && room.status === "available");
        if (!isDirty && !isCleaning && !isReady) return [];
        return [{
          id: room.id,
          number: room.name,
          floor: room.floor,
          type: room.room_type_name ?? room.room_type_id ?? "Phòng",
          status: isDirty ? "to-clean" : isCleaning ? "in-progress" : "ready",
          subType: isDirty || isCleaning ? "checkout-dirty" : "stayover",
          checklist: [],
          minibar: [],
        }];
      });
      setLiveRooms(mappedRooms);
    } catch (err: any) {
      console.error("Backend housekeeping data error:", err);
      if (err?.status === 401) {
        setError("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.");
      } else if (err?.status === 403) {
        setError("Tài khoản không có quyền truy cập dữ liệu buồng phòng.");
      } else {
        setError("Không thể tải dữ liệu vận hành. Vui lòng thử lại.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleStartClean = async (room: HKRoom) => {
    try {
      await housekeepingTechnicalApi.updateRoomStatus(room.id, "cleaning");
      await loadData();
    } catch (err) {
      console.error("Unable to start cleaning on backend:", err);
      alert("Không thể bắt đầu dọn phòng. Vui lòng thử lại.");
      await loadData();
    }
  };

  const handleCompleteRoom = async (room: HKRoom) => {
    if (room.checklist.some(item => !item.done)) {
      alert("Cần hoàn thành toàn bộ checklist trước khi bàn giao vệ sinh.");
      return;
    }
    try {
      await housekeepingTechnicalApi.updateRoomStatus(room.id, "available");
      await loadData();
    } catch (err) {
      console.error("Unable to complete housekeeping task on backend:", err);
      alert(apiErrorMessage(err, "Không thể hoàn tất vệ sinh phòng. Vui lòng thử lại."));
      await loadData();
    }
  };

  const NAV: { id: NavPage; label: string; Icon: React.ElementType }[] = [
    { id:"overview",   label:"Tổng quan",            Icon:Home },
    { id:"board", label:"Bảng trạng thái phòng", Icon:LayoutGrid },
    { id:"services", label:"Dịch vụ", Icon:Wine },
  ];

  const employeeName = currentUser?.full_name ?? "Nhân viên buồng phòng";
  const employeeInitial = employeeName.charAt(0).toUpperCase();
  const employeeRole = currentUser?.role ? employeeRoleLabel(currentUser.role) : "Nhân viên buồng phòng";

  return (
    <div style={{ display:"flex",height:"100vh",overflow:"hidden",
      background:"#F8FAFC",fontFamily:"'Inter',system-ui,sans-serif" }}>

      {/* SIDEBAR */}
      <aside style={{ width:195,background:"#FFF",borderRight:"1px solid #E2E8F0",
        display:"flex",flexDirection:"column",flexShrink:0 }}>
        {/* Brand */}
        <div style={{ padding:"14px 16px 12px",borderBottom:"1px solid #E2E8F0" }}>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <img
              src="/hotel_logo.png"
              alt="MaM Hotel Logo"
              style={{ width:38,height:"auto",objectFit:"contain",flexShrink:0,filter:"drop-shadow(0 2px 6px rgba(184,148,74,0.35))" }}
            />
            <div>
              <p style={{ fontSize:14,fontWeight:700,color:"#0F172A",lineHeight:1.1,fontFamily:"'Cormorant Garamond',Georgia,serif",letterSpacing:"0.05em",margin:0 }}>MaM Hotel</p>
              <p style={{ fontSize:9,color:"#16A34A",letterSpacing:"0.1em",textTransform:"uppercase",marginTop:2,marginBottom:0,fontWeight:600 }}>VẬN HÀNH BUỒNG PHÒNG</p>
            </div>
          </div>
        </div>
        {/* Nav */}
        <nav style={{ flex:1,padding:"10px 8px",overflowY:"auto" }}>
          {NAV.map(n => {
            const active = page === n.id;
            return (
              <button key={n.id} onClick={() => setPage(n.id)}
                style={{ width:"100%",display:"flex",alignItems:"center",gap:9,
                  padding:"8px 10px",borderRadius:8,cursor:"pointer",marginBottom:2,
                  background:active?"#DBEAFE":"transparent",
                  border:"none",
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
            onClick={() => setSidebarProfileOpen(p => !p)}
            style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8,cursor:"pointer" }}
            title="Xem hồ sơ & đổi mật khẩu"
          >
            <div style={{ width:30,height:30,borderRadius:99,flexShrink:0,
              background:"linear-gradient(135deg,#1D4ED8,#3B82F6)",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:12,fontWeight:800,color:"#FFF" }}>{employeeInitial}</div>
            <div style={{ flex:1,minWidth:0 }}>
              <p style={{ fontSize:11,fontWeight:700,color:"#0F172A",lineHeight:1,margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{employeeName}</p>
              <p style={{ fontSize:10,color:"#94A3B8",margin:"2px 0 0" }}>{employeeRole}</p>
            </div>
            <ChevronDown size={12} style={{ color:"#94A3B8" }} />
          </div>
          <button onClick={onBack}
            style={{ display:"flex",alignItems:"center",gap:5,color:"#94A3B8",cursor:"pointer",fontSize:11,background:"transparent",border:"none",padding:0 }}>
            <LogOut size={11} /> Đăng xuất
          </button>
          <EmployeeProfileDropdown
            isOpen={sidebarProfileOpen}
            onClose={() => setSidebarProfileOpen(false)}
            onLogout={onBack}
            align="bottom-left"
            currentRoleLabel="Buồng phòng"
            departmentName="Bộ phận Buồng phòng"
          />
        </div>
      </aside>

      {/* MAIN */}
      <div style={{ flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0 }}>

        {/* TOP HEADER */}
        <header style={{ background:"#FFF",borderBottom:"1px solid #E2E8F0",
          height:56,display:"flex",alignItems:"center",gap:12,padding:"0 20px",flexShrink:0 }}>
          <div>
            <p style={{ fontSize:15,fontWeight:700,color:"#0F172A",lineHeight:1,margin:0 }}>
              Trạm Buồng phòng · Ca trực
            </p>
            <p style={{ fontSize:11,color:"#94A3B8",margin:"2px 0 0" }}>Quản lý hoạt động buồng phòng theo thời gian thực</p>
          </div>
          <div style={{ flex:1 }} />
          {/* Search */}
          <div style={{ position:"relative" }}>
            <Search size={13} style={{ position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#94A3B8",pointerEvents:"none" }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Tìm phòng, ghi chú..."
              style={{ height:34,paddingLeft:30,paddingRight:10,borderRadius:8,width:200,
                border:"1px solid #E2E8F0",background:"#F8FAFC",fontSize:12,outline:"none" }} />
          </div>
          {/* Bell */}
          <button type="button" onClick={() => void loadData()} disabled={loading}
            aria-label="Làm mới dữ liệu buồng phòng" title="Làm mới trạng thái phòng"
            style={{ width:34,height:34,borderRadius:8,background:"#F8FAFC",border:"1px solid #E2E8F0",
              display:"flex",alignItems:"center",justifyContent:"center",cursor:loading?"wait":"pointer",flexShrink:0 }}>
            <RefreshCcw size={14} style={{ color:"#475569" }} />
          </button>
          {/* Staff */}
          <div style={{ position:"relative" }}>
            <div
              onClick={() => setTopProfileOpen(p => !p)}
              style={{ display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"4px 6px",borderRadius:8 }}
              title="Hồ sơ nhân viên"
            >
              <div style={{ width:30,height:30,borderRadius:99,
                background:"linear-gradient(135deg,#16A34A,#15803D)",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:11,fontWeight:700,color:"#FFF" }}>{employeeInitial}</div>
              <div>
                <p style={{ fontSize:12,fontWeight:700,color:"#0F172A",lineHeight:1,margin:0 }}>{employeeName}</p>
                <p style={{ fontSize:10,color:"#94A3B8",margin:"2px 0 0" }}>{employeeRole}</p>
              </div>
              <ChevronDown size={12} style={{ color:"#94A3B8" }} />
            </div>
            <EmployeeProfileDropdown
              isOpen={topProfileOpen}
              onClose={() => setTopProfileOpen(false)}
              onLogout={onBack}
              align="top-right"
              currentRoleLabel="Buồng phòng"
              departmentName="Bộ phận Buồng phòng"
            />
          </div>
        </header>

        {/* Error banner with retry button */}
        {error && (
          <div style={{ padding:"12px 20px",background:"#FEF2F2",borderBottom:"1px solid #FECDD3",
            display:"flex",alignItems:"center",justifyContent:"space-between" }}>
            <div style={{ display:"flex",alignItems:"center",gap:8,color:"#B91C1C",fontSize:12,fontWeight:600 }}>
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
            <button onClick={() => void loadData()}
              style={{ padding:"4px 12px",borderRadius:6,border:"1px solid #B91C1C",background:"#FFF",color:"#B91C1C",fontSize:11,fontWeight:700,cursor:"pointer" }}>
              Thử lại
            </button>
          </div>
        )}

        {/* Loading banner */}
        {loading && (
          <div style={{ padding:"10px 20px",background:"#EFF6FF",borderBottom:"1px solid #BFDBFE",
            display:"flex",alignItems:"center",gap:8,color:"#1D4ED8",fontSize:12,fontWeight:600 }}>
            <RefreshCcw size={14} className="animate-spin" />
            <span>Đang tải dữ liệu vận hành từ hệ thống...</span>
          </div>
        )}

        {/* KPI BAR */}

        {/* CONTENT */}
        {page === "overview"   && (
          <OverviewScreen
            rooms={liveRooms}
            search={search}
            onStartClean={handleStartClean}
            onComplete={handleCompleteRoom}
            currentUser={currentUser}
          />
        )}
        {page === "board"      && (
          <BoardScreen
            rooms={liveRooms}
            search={search}
            onStartClean={handleStartClean}
            onComplete={handleCompleteRoom}
            currentUser={currentUser}
          />
        )}
        {page === "services" && <ServicesPanel/>}
      </div>
    </div>
  );
}
