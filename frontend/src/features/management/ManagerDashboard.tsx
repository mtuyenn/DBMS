import { Home, BarChart2, Users, Search, CalendarDays, ChevronDown, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { authApi } from "../../shared/api/auth";
import { apiClient, apiErrorMessage } from "../../shared/api/client";
import { frontDeskApi } from "../../shared/api/frontDesk";
import { managementApi, type ManagementOverview, type RoomTypePerformance } from "../../shared/api/management";
import { EmployeeProfileDropdown } from "../../shared/components/EmployeeProfileDropdown";
import type { Invoice as ApiInvoice } from "../../shared/types/frontDesk";
import type { Room as ApiRoom } from "../../shared/types/housekeepingTechnical";
import type { EmployeeAdmin } from "../../shared/types/hrGovernance";
import { formatVnd } from "../../shared/utils/money";
import { invoiceTotal } from "../accounting/accountingLogic";
import { useManagementFinance, type ManagementFinance } from "./managementFinance";
import { ManagerCatalogs } from "./ManagerCatalogs";
import "./management.css";
type NavPage = "overview" | "reports" | "catalogs";
type ManagerRole = "manager";
const fmtVND = formatVnd;
const SIDE_NAV = [{id:"overview",label:"Tổng quan",Icon:Home},{id:"reports",label:"Báo cáo điều hành",Icon:BarChart2},{id:"catalogs",label:"Danh mục & nhân viên",Icon:Users}] as const;
function OverviewScreen({rooms=[],invoices=[],finance,summary}:{rooms?:ApiRoom[];invoices?:ApiInvoice[];finance:ManagementFinance;summary:ManagementOverview|null}) {
  const occupiedRooms = summary?.so_phong_co_khach ?? rooms.filter(room => room.status === "occupied").length;
  const totalRooms = summary
    ? summary.so_phong_san_sang + summary.so_phong_co_khach + summary.so_phong_can_don + summary.so_phong_dang_don
    : rooms.length;
  const occupancy = totalRooms ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
  const paidInvoices = invoices.filter(invoice => invoice.status === "DA_THANH_TOAN" && invoice.issued_at.startsWith(finance.today));
  const revenue = finance.daily?.net_total;
  const averageInvoice = paidInvoices.length ? Math.round(paidInvoices.reduce((sum, invoice) => sum + invoiceTotal(invoice), 0) / paidInvoices.length) : 0;
  const barData = finance.days;
  const maxRev = Math.max(...barData.map(item => Math.abs(item.rev)), 1);
  return (
    <div style={{ flex:1,overflowY:"auto",padding:"20px 24px" }}>

      {/* KPI CARDS */}
      <div className="management-kpis" style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:20 }}>
        {[
          { label:"Công suất phòng hiện tại", val:`${occupancy}%`, sub:`${occupiedRooms} / ${totalRooms} phòng có khách`, note:"Không gồm phòng giữ chỗ", color:"#3B82F6", prog:occupancy },
          { label:"Tiền đã thu hôm nay", val:finance.daily ? fmtVND(finance.daily.net_total) : "—", sub:null, note:"Theo giao dịch hoàn tất", color:"#10B981", prog:null },
          { label:"Giá trị hóa đơn bình quân hôm nay", val:fmtVND(averageInvoice), sub:`${paidInvoices.length} hóa đơn đã thanh toán`, note:"Theo ngày lập hóa đơn", color:"#8B5CF6", prog:null },
          { label:"Giao dịch hoàn tất hôm nay", val:finance.daily ? String(finance.daily.completed_transactions) : "—", sub:null, note:"Theo giao dịch đã thu", color:"#F59E0B", prog:null },
        ].map((k, index) => (
          <div key={`${k.label}-${index}`} style={{ background:"#FFF",borderRadius:12,border:"1px solid #E2E8F0",
            padding:"16px 18px",boxShadow:"0 1px 3px rgba(0,0,0,.04)" }}>
            <p style={{ fontSize:11,color:"#64748B",marginBottom:6,lineHeight:1.4 }}>{k.label}</p>
            <p style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:k.val.length>10?18:22,fontWeight:800,
              color:"#0F172A",lineHeight:1,marginBottom:k.sub?4:6 }}>{k.val}</p>
            {k.sub && <p style={{ fontSize:11,color:"#64748B",marginBottom:6 }}>{k.sub}</p>}
            {k.prog !== null && (
              <div style={{ height:5,background:"#E2E8F0",borderRadius:99,overflow:"hidden",marginBottom:6 }}>
                <div style={{ height:"100%",width:`${k.prog}%`,borderRadius:99,background:k.color }} />
              </div>
            )}
            <div style={{ display:"flex",alignItems:"center",gap:3 }}>
              <span style={{ fontSize:11,fontWeight:600,color:"#16A34A" }}>{k.note}</span>
            </div>
          </div>
        ))}
      </div>

      {summary && <div style={{background:"#FFF",border:"1px solid #E2E8F0",borderRadius:12,padding:"14px 18px",marginBottom:20}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
          <strong style={{fontSize:13,color:"#0F172A"}}>Nhân sự đang hoạt động</strong>
          <span style={{fontSize:12,color:"#64748B"}}>{summary.so_le_tan + summary.so_quan_ly + summary.so_buong_phong + summary.so_ke_toan} nhân viên · {summary.so_loai_phong_dang_hoat_dong} loại phòng đang kinh doanh</span>
        </div>
        <div style={{display:"flex",gap:18,flexWrap:"wrap",marginTop:10,fontSize:12,color:"#475569"}}>
          <span>Lễ tân: <strong>{summary.so_le_tan}</strong></span><span>Buồng phòng: <strong>{summary.so_buong_phong}</strong></span><span>Kế toán: <strong>{summary.so_ke_toan}</strong></span><span>Quản lý: <strong>{summary.so_quan_ly}</strong></span>
        </div>
      </div>}

      {/* BOTTOM ROW */}
      <div className="management-bottom" style={{ display:"grid",gridTemplateColumns:"1fr 240px",gap:16 }}>

        <div style={{ background:"#FFF",borderRadius:12,border:"1px solid #E2E8F0",padding:18 }}>
          <p style={{fontSize:14,fontWeight:700,marginBottom:16}}>Tiền đã thu 7 ngày qua</p>
          {finance.error ? <p role="alert" style={{color:"#B91C1C",fontSize:13}}>{finance.error} <button onClick={finance.reload}>Tải lại</button></p> : !finance.daily ? <p role="status">Đang tải số liệu…</p> : <div style={{display:"flex",gap:8,height:180,alignItems:"flex-end"}}>
            {barData.map(day => <div key={day.date} style={{flex:1,minWidth:0,textAlign:"center"}} title={`${day.date}: ${fmtVND(day.rev)}`}>
              <span style={{fontSize:10,color:"#475569",display:"block",marginBottom:4}}>{fmtVND(day.rev)}</span>
              <div style={{height:Math.max(2,Math.abs(day.rev)/maxRev*125),background:day.rev<0?"#EF4444":day.today?"#2563EB":"#BFDBFE",borderRadius:4}} />
              <span style={{display:"block",fontSize:11,color:"#64748B",marginTop:8}}>{day.day}</span>
            </div>)}
          </div>}
          <p style={{fontSize:11,color:"#64748B",marginTop:12}}>Các khoản đã thu theo ngày giao dịch.</p>
        </div>
        <div style={{ background:"#FFF",borderRadius:12,border:"1px solid #E2E8F0",padding:16 }}>
          <p style={{fontSize:13,fontWeight:700,marginBottom:14}}>Thanh toán hôm nay</p>
          <p style={{fontSize:12,color:"#64748B"}}>Tổng thu</p><p style={{fontSize:18,fontWeight:700,marginBottom:14}}>{finance.daily ? fmtVND(finance.daily.total_payments) : "—"}</p>
          <p style={{fontSize:12,color:"#64748B"}}>Tổng hoàn</p><p style={{fontSize:18,fontWeight:700}}>{finance.daily ? fmtVND(finance.daily.total_refunds) : "—"}</p>
          <p style={{fontSize:11,color:"#64748B",marginTop:14}}>Theo thời điểm giao dịch, độc lập với ngày lập hóa đơn.</p>
        </div>

      </div>
    </div>
  );
}

function ReportsScreen({ invoices = [], summary, roomTypeStats = [], finance }: { invoices?: ApiInvoice[]; summary:ManagementOverview|null; roomTypeStats?:RoomTypePerformance[]; finance: ManagementFinance }) {
  const month = finance.today.slice(0, 7);
  const paid = invoices.filter(invoice => invoice.status === "DA_THANH_TOAN" && invoice.issued_at.startsWith(month));
  const occupied = summary?.so_phong_co_khach ?? 0;
  const totalRooms = summary
    ? summary.so_phong_san_sang + summary.so_phong_co_khach + summary.so_phong_can_don + summary.so_phong_dang_don
    : 0;
  return <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>
    {finance.error && <p role="alert" style={{color:"#B91C1C",marginBottom:16}}>{finance.error} <button onClick={finance.reload}>Tải lại</button></p>}
    <p style={{fontSize:13,color:"#64748B",marginBottom:16}}>Số liệu từ ngày 01/{month.slice(5)}/{month.slice(0,4)} đến {finance.today}. Công suất phản ánh trạng thái hiện tại.</p>
    <div className="management-kpis" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:20}}>
      {[
        {label:"Tiền đã thu trong tháng",value:finance.monthly ? fmtVND(finance.monthly.net_total) : "—",note:"Theo giao dịch thanh toán hoàn tất"},
        {label:"Hóa đơn thanh toán trong tháng",value:String(paid.length),note:"Theo ngày lập hóa đơn"},
        {label:"Công suất phòng hiện tại",value:`${totalRooms ? Math.round(occupied/totalRooms*100) : 0}%`,note:`${occupied}/${totalRooms} phòng có khách`},
      ].map(item=><div key={item.label} style={{background:"#FFF",border:"1px solid #E2E8F0",borderRadius:12,padding:16}}><p style={{fontSize:12,color:"#64748B"}}>{item.label}</p><p style={{fontSize:22,fontWeight:800,margin:"8px 0"}}>{item.value}</p><p style={{fontSize:12,color:"#64748B"}}>{item.note}</p></div>)}
    </div>
    <div style={{background:"#FFF",border:"1px solid #E2E8F0",borderRadius:12,padding:18,overflowX:"auto"}}>
      <h2 style={{fontSize:16,fontWeight:700}}>Hóa đơn đã thanh toán lập trong tháng ({paid.length})</h2>
      <p style={{fontSize:12,color:"#64748B",margin:"6px 0 14px"}}>Tiền phòng và dịch vụ theo giá đã lưu khi phát sinh.</p>
      <table style={{width:"100%",minWidth:480,borderCollapse:"collapse",fontSize:13}}><thead><tr>{["Hóa đơn","Đặt phòng","Ngày lập","Giá trị sau giảm giá"].map(title=><th key={title} style={{textAlign:"left",padding:10,background:"#F8FAFC"}}>{title}</th>)}</tr></thead>
        <tbody>{paid.map(invoice=><tr key={invoice.id}><td style={{padding:10}}>INV-{invoice.id}</td><td>#{invoice.reservation_id}</td><td>{invoice.issued_at.slice(0,10)}</td><td>{fmtVND(invoiceTotal(invoice))}</td></tr>)}{paid.length===0&&<tr><td colSpan={4} style={{padding:24,textAlign:"center",color:"#64748B"}}>Chưa có hóa đơn đã thanh toán lập trong tháng này.</td></tr>}</tbody>
      </table>
    </div>
    <section aria-labelledby="room-type-performance-title" style={{background:"#FFF",border:"1px solid #E2E8F0",borderRadius:12,padding:18,marginTop:16,overflowX:"auto"}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16,marginBottom:12}}>
        <div>
          <h2 id="room-type-performance-title" style={{fontSize:16,fontWeight:700}}>Tình hình khai thác theo loại phòng</h2>
          <p style={{fontSize:12,color:"#64748B",marginTop:5}}>Giúp quản lý thấy loại phòng nào đang kín, còn trống hoặc cần dọn.</p>
        </div>
        <span style={{fontSize:11,color:"#64748B",whiteSpace:"nowrap"}}>Cập nhật theo trạng thái hiện tại</span>
      </div>
      {roomTypeStats.length === 0 ? <p role="status" style={{padding:"22px 8px",textAlign:"center",fontSize:13,color:"#64748B"}}>Chưa có dữ liệu phòng để thống kê.</p> :
        <table style={{width:"100%",minWidth:700,borderCollapse:"collapse",fontSize:13}}>
          <thead><tr>{["Loại phòng","Giá niêm yết / ngày","Có khách","Sẵn sàng","Cần dọn / bảo trì","Công suất hiện tại"].map(title=><th key={title} style={{textAlign:"left",padding:"10px 8px",background:"#F8FAFC",color:"#475569",fontWeight:600}}>{title}</th>)}</tr></thead>
          <tbody>{roomTypeStats.map(type=>{
            const rate = Math.round(type.cong_suat_hien_tai);
            return <tr key={type.ma_loai_phong} style={{borderTop:"1px solid #E2E8F0"}}>
              <td style={{padding:"12px 8px"}}><strong style={{color:"#0F172A"}}>{type.ten_loai_phong}</strong><span style={{display:"block",fontSize:11,color:"#94A3B8",marginTop:3}}>{type.ma_loai_phong} · {type.tong_so_phong} phòng</span></td>
              <td style={{padding:"12px 8px",whiteSpace:"nowrap"}}>{fmtVND(type.gia_theo_ngay)}</td>
              <td style={{padding:"12px 8px"}}>{type.so_phong_co_khach}</td>
              <td style={{padding:"12px 8px"}}>{type.so_phong_san_sang}</td>
              <td style={{padding:"12px 8px"}}>{type.so_phong_can_don + type.so_phong_bao_tri}</td>
              <td style={{padding:"12px 8px",minWidth:150}}><div style={{display:"flex",alignItems:"center",gap:8}}><div role="img" aria-label={`Công suất ${type.ten_loai_phong}: ${rate}%`} style={{height:7,flex:1,background:"#E2E8F0",borderRadius:99,overflow:"hidden"}}><div style={{height:"100%",width:`${rate}%`,background:rate>=80?"#F59E0B":"#2563EB",borderRadius:99}} /></div><strong style={{minWidth:36,textAlign:"right"}}>{rate}%</strong></div></td>
            </tr>;
          })}</tbody>
        </table>}
    </section>
  </div>;
}

export default function ManagerDashboard({onBack}: {role:ManagerRole;onBack:()=>void}) {
 const finance=useManagementFinance();
 const [page,setPage]=useState<NavPage>("overview");
 const [search,setSearch]=useState("");
 const [liveRooms,setLiveRooms]=useState<ApiRoom[]>([]);
 const [liveEmployees,setLiveEmployees]=useState<EmployeeAdmin[]>([]);
 const [liveInvoices,setLiveInvoices]=useState<ApiInvoice[]>([]);
 const [managementSummary,setManagementSummary]=useState<ManagementOverview|null>(null);
 const [roomTypePerformance,setRoomTypePerformance]=useState<RoomTypePerformance[]>([]);
 const [managerName,setManagerName]=useState("Quản lý");
 const [operationsError,setOperationsError]=useState("");
 const [topProfileOpen,setTopProfileOpen]=useState(false);
 const [sidebarProfileOpen,setSidebarProfileOpen]=useState(false);
 const [version,setVersion]=useState(0);
 const managerDeptTitle="Ban Quản lý";
 const managerInitials=managerName.split(/\s+/).slice(-2).map(x=>x[0]).join("");
 useEffect(()=>{let active=true; (async()=>{
   const [profile,rooms,employees,summary,roomTypes]=await Promise.all([authApi.employeeProfile(),apiClient.request<ApiRoom[]>("/api/rooms"),apiClient.request<EmployeeAdmin[]>("/api/auth/employees"),managementApi.overview(),managementApi.roomTypePerformance()]);
   const invoices:ApiInvoice[]=[];
   for(let page=0;;page++){const result=await frontDeskApi.invoices({page,size:100});invoices.push(...result.items);if(page+1>=result.total_pages)break;}
   if(active){setManagerName(profile.full_name);setLiveRooms(rooms);setLiveEmployees(employees);setLiveInvoices(invoices);setManagementSummary(summary);setRoomTypePerformance(roomTypes);setOperationsError("");}
 })().catch(e=>{if(active)setOperationsError(apiErrorMessage(e,"Không thể tải dữ liệu quản lý."));}); return()=>{active=false;};},[version]);
 return (
    <div className="management-station" style={{ display:"flex",height:"100vh",overflow:"hidden",
      background:"#F8FAFC",fontFamily:"'Inter',system-ui,sans-serif" }}>

      {/* SIDEBAR */}
      <aside style={{ width:200,background:"#FFF",borderRight:"1px solid #E2E8F0",
        display:"flex",flexDirection:"column",flexShrink:0,overflow:"hidden" }}>
        {/* Brand */}
        <div style={{ padding:"14px 14px 12px",borderBottom:"1px solid #E2E8F0" }}>
          <div style={{ display:"flex",alignItems:"center",gap:9 }}>
            <img
              src="/hotel_logo.png"
              alt="MaM Hotel Logo"
              style={{ width:36,height:"auto",objectFit:"contain",flexShrink:0,filter:"drop-shadow(0 2px 6px rgba(184,148,74,0.35))" }}
            />
            <div>
              <p style={{ fontSize:13,fontWeight:700,color:"#0F172A",lineHeight:1.1,fontFamily:"'Cormorant Garamond',Georgia,serif",letterSpacing:"0.05em" }}>MaM Hotel</p>
              <p style={{ fontSize:9,color:"#7C3AED",letterSpacing:"0.08em",textTransform:"uppercase",marginTop:2,fontWeight:600 }}>BAN ĐIỀU HÀNH</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex:1,padding:"10px 8px",overflowY:"auto" }}>
          {SIDE_NAV.map(n => {
            const active = page === n.id;
            return (
              <button key={n.id} onClick={() => setPage(n.id)}
                style={{ width:"100%",display:"flex",alignItems:"center",gap:9,
                  padding:"9px 10px",borderRadius:8,cursor:"pointer",marginBottom:2,
                  background:active?"#EFF6FF":"transparent",
                  color:active?"#1D4ED8":"#475569",fontWeight:active?700:400,fontSize:13,
                  textAlign:"left",transition:"all .1s" }}>
                <n.Icon size={15} style={{ color:active?"#2563EB":"#94A3B8",flexShrink:0 }} strokeWidth={active?2:1.5} />
                <span style={{ flex:1 }}>{n.label}</span>
                {false && (
                  <span style={{ fontSize:10,fontWeight:800,minWidth:18,height:18,borderRadius:99,
                    background:"#EF4444",color:"#FFF",display:"flex",alignItems:"center",justifyContent:"center",
                    padding:"0 4px" }}>{0}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* GM Profile */}
        <div style={{ padding:"10px 14px",borderTop:"1px solid #F1F5F9",position:"relative" }}>
          <div
            onClick={()=>setSidebarProfileOpen(p=>!p)}
            style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8,cursor:"pointer" }}
            title="Hồ sơ nhân viên"
          >
            <div style={{ width:30,height:30,borderRadius:99,flexShrink:0,
              background:"linear-gradient(135deg,#1D4ED8,#3B82F6)",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:12,fontWeight:800,color:"#FFF" }}>{managerInitials}</div>
            <div>
              <p style={{ fontSize:11,fontWeight:700,color:"#0F172A",lineHeight:1 }}>{managerName}</p>
              <p style={{ fontSize:10,color:"#94A3B8" }}>{managerDeptTitle}</p>
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
            currentRoleLabel={"Quản lý"}
            departmentName={"Ban Quản lý"}
          />
        </div>
      </aside>

      {/* MAIN */}
      <div style={{ flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0 }}>

        {/* HEADER */}
        <header style={{ background:"#FFF",borderBottom:"1px solid #E2E8F0",height:54,
          display:"flex",alignItems:"center",gap:12,padding:"0 24px",flexShrink:0 }}>
          <div style={{ position:"relative",flex:1,maxWidth:520 }}>
            <Search size={13} style={{ position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",color:"#94A3B8",pointerEvents:"none" }} />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm phòng hoặc nhân viên..."
              style={{ width:"100%",height:34,paddingLeft:32,paddingRight:42,borderRadius:8,
                border:"1px solid #E2E8F0",background:"#F8FAFC",fontSize:12,outline:"none",boxSizing:"border-box" }} />
            {search.trim() && <div style={{position:"absolute",left:0,right:0,top:38,zIndex:50,background:"white",border:"1px solid #CBD5E1",borderRadius:8,padding:8,maxHeight:280,overflowY:"auto",boxShadow:"0 10px 20px #0F172A18"}}>
              {[...liveRooms.filter(room => `${room.id} ${room.name}`.toLowerCase().includes(search.toLowerCase())).slice(0,6).map(room => ({key:`room-${room.id}`,label:`Phòng ${room.name} · ${room.room_type_name}`,page:"catalogs" as NavPage})),
              ...liveEmployees.filter(employee => `${employee.employee_id} ${employee.full_name}`.toLowerCase().includes(search.toLowerCase())).slice(0,6).map(employee=>({key:employee.employee_id,label:employee.full_name,page:"reports" as NavPage}))].map(result=><button key={result.key} onClick={()=>{const room=liveRooms.find(item=>result.key===`room-${item.id}`); setPage(result.page);setSearch("");}} style={{display:"block",width:"100%",textAlign:"left",padding:10,fontSize:13}}>{result.label}</button>)}
              {!liveRooms.some(room => `${room.id} ${room.name}`.toLowerCase().includes(search.toLowerCase())) && !liveEmployees.some(employee => `${employee.employee_id} ${employee.full_name}`.toLowerCase().includes(search.toLowerCase())) && <p style={{padding:10,fontSize:13}}>Không tìm thấy kết quả.</p>}
            </div>}
          </div>

          {/* Date */}
          <div style={{ display:"flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:8,
            border:"1px solid #E2E8F0",background:"#F8FAFC",cursor:"pointer" }}>
            <CalendarDays size={12} style={{ color:"#64748B" }} />
            <span style={{ fontSize:12,color:"#334155",whiteSpace:"nowrap" }}>{new Date().toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "short", day: "numeric" })}</span>
            <ChevronDown size={11} style={{ color:"#94A3B8" }} />
          </div>

          <div style={{ flex:1 }} />

          <div style={{ position:"relative" }}>
            <div
              onClick={()=>setTopProfileOpen(p=>!p)}
              style={{ display:"flex",alignItems:"center",gap:8,cursor:"pointer" }}
              title="Hồ sơ nhân viên"
            >
              <div style={{ width:32,height:32,borderRadius:99,
                background:"linear-gradient(135deg,#1D4ED8,#3B82F6)",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:12,fontWeight:800,color:"#FFF" }}>{managerInitials}</div>
              <div>
                <p style={{ fontSize:12,fontWeight:700,color:"#0F172A",lineHeight:1 }}>{managerName}</p>
                <p style={{ fontSize:10,color:"#94A3B8" }}>{managerDeptTitle}</p>
              </div>
              <ChevronDown size={12} style={{ color:"#94A3B8" }} />
            </div>
            <EmployeeProfileDropdown
              isOpen={topProfileOpen}
              onClose={()=>setTopProfileOpen(false)}
              onLogout={onBack}
              align="top-right"
              currentRoleLabel={"Quản lý"}
              departmentName={"Ban Quản lý"}
            />
          </div>
        </header>

        {/* PAGE TITLE */}
        <div style={{ padding:"16px 24px 12px",background:"#FFF",borderBottom:"1px solid #E2E8F0",flexShrink:0 }}>
          <h1 style={{ fontSize:22,fontWeight:800,color:"#0F172A",marginBottom:2 }}>
            {page==="overview"   && "Tổng quan điều hành"}
            {page==="reports" && "Báo cáo điều hành"}{page==="catalogs" && "Danh mục & nhân viên"}
          </h1>
          <p style={{ fontSize:13,color:"#64748B" }}>
            {page==="overview"  && `Chào mừng trở lại, ${"Quản lý"}! Đây là tình hình hoạt động của khách sạn hôm nay.`}
            {page==="reports"   && `Báo cáo tổng hợp kinh doanh tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}.`}
          </p>
        </div>

        {/* CONTENT */}
        <div style={{ flex:1,display:"flex",flexDirection:"column",overflow:"hidden" }}>
          {operationsError && <p role="alert" className="p-4 text-red-700">{operationsError} <button onClick={()=>setVersion(v=>v+1)}>Tải lại</button></p>}
          {page === "overview" && <OverviewScreen rooms={liveRooms} invoices={liveInvoices} finance={finance} summary={managementSummary}/>}
          {page === "reports" && <ReportsScreen invoices={liveInvoices} finance={finance} summary={managementSummary} roomTypeStats={roomTypePerformance}/>}
          {page === "catalogs" && <ManagerCatalogs onChanged={()=>setVersion(v=>v+1)}/>}
        </div>
      </div>

    </div>
  );
}
