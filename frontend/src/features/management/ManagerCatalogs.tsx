import { useEffect, useState } from "react";
import { apiClient, apiErrorMessage } from "../../shared/api/client";
import { employeeRoleLabel, type EmployeeRole } from "../../shared/types/api";

type Employee = { employee_id:string; full_name:string; role:EmployeeRole; phone:string };
type RoomType = { id:string; name:string; daily_price:number; description:string };
type Room = { id:string; room_type_id:string; floor:number; description:string };
export type CatalogFocusTarget = { type:"employee"|"room"; id:string; nonce:number };
const roles:EmployeeRole[]=["FRONT_DESK","MANAGER","HOUSEKEEPING","ACCOUNTING"];
const input="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
const button="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50";

export function ManagerCatalogs({onChanged,currentEmployeeId,focusTarget=null}:{onChanged:()=>void;currentEmployeeId:string;focusTarget?:CatalogFocusTarget|null}) {
 const [tab,setTab]=useState<"employees"|"types"|"rooms"|"audit">("employees");
 const [highlightedTarget,setHighlightedTarget]=useState<string|null>(null);
 const [employees,setEmployees]=useState<Employee[]>([]);
 const [types,setTypes]=useState<RoomType[]>([]);
 const [rooms,setRooms]=useState<Room[]>([]);
 const [audit,setAudit]=useState<{id:number;action:string;entity_type:string;entity_id:string;created_at:string}[]>([]);
 const [error,setError]=useState(""); const [notice,setNotice]=useState("");
 const [busy,setBusy]=useState(false); const [loading,setLoading]=useState(true);
 const [version,setVersion]=useState(0);
 const [employee,setEmployee]=useState({employee_id:"",full_name:"",phone:"",password:"",role:"FRONT_DESK" as EmployeeRole});
 const [type,setType]=useState<RoomType>({id:"",name:"",daily_price:650000,description:""});
 const [room,setRoom]=useState<Room>({id:"",room_type_id:"STD",floor:1,description:""});
 useEffect(()=>{let active=true;setLoading(true);Promise.all([
   apiClient.request<Employee[]>("/api/auth/employees"),apiClient.request<RoomType[]>("/api/room-types"),apiClient.request<Room[]>("/api/rooms/admin"),
   apiClient.request<{items:typeof audit}>("/api/governance/audit?page=0&size=30")
 ]).then(([e,t,r,a])=>{if(active){setEmployees(e);setTypes(t);setRooms(r);setAudit(a.items);setError("");}})
 .catch(e=>{if(active)setError(apiErrorMessage(e,"Không thể tải danh mục."));}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[version]);
 useEffect(()=>{if(focusTarget)setTab(focusTarget.type==="employee"?"employees":"rooms");},[focusTarget]);
 useEffect(()=>{
  if(!focusTarget||loading||tab!==(focusTarget.type==="employee"?"employees":"rooms"))return;
  const targetKey=`${focusTarget.type}:${focusTarget.id}`;
  const row=Array.from(document.querySelectorAll<HTMLTableRowElement>("[data-catalog-target]")).find(item=>item.dataset.catalogTarget===targetKey);
  if(!row)return;
  row.scrollIntoView?.({behavior:"smooth",block:"center"});
  setHighlightedTarget(targetKey);
  const timer=window.setTimeout(()=>setHighlightedTarget(current=>current===targetKey?null:current),1600);
  return()=>window.clearTimeout(timer);
 },[focusTarget,loading,tab]);
 async function save(action:()=>Promise<unknown>,successMessage="Đã lưu."){if(busy)return;setBusy(true);setError("");setNotice("");try{await action();setNotice(successMessage);setVersion(v=>v+1);onChanged();}catch(e){setError(apiErrorMessage(e,"Không thể lưu. Kiểm tra lại dữ liệu."));}finally{setBusy(false);}}
 return <section className="overflow-y-auto p-5 text-sm">
  <nav className="mb-4 flex flex-wrap gap-2" aria-label="Danh mục quản lý">{([["employees","Nhân viên"],["types","Loại phòng"],["rooms","Phòng"],["audit","Nhật ký"]] as const).map(([id,label])=><button key={id} className={button} aria-pressed={tab===id} onClick={()=>{setTab(id);setNotice("");}}>{label}</button>)}</nav>
  {error&&<p role="alert" className="mb-3 text-red-700">{error} <button onClick={()=>setVersion(v=>v+1)}>Tải lại</button></p>}{notice&&<p role="status" className="mb-3 text-green-700">{notice}</p>}{loading&&<p role="status">Đang tải…</p>}
  {tab==="employees"&&<>
   <form className="mb-5 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-4" onSubmit={e=>{e.preventDefault();void save(()=>apiClient.request("/api/auth/employees",{method:"POST",body:employee}));}}>
    <input className={input} aria-label="Mã nhân viên" placeholder="Mã nhân viên" maxLength={10} required value={employee.employee_id} onChange={e=>setEmployee({...employee,employee_id:e.target.value})}/>
    <input className={input} aria-label="Họ tên" placeholder="Họ tên" required value={employee.full_name} onChange={e=>setEmployee({...employee,full_name:e.target.value})}/>
    <input className={input} aria-label="Điện thoại" placeholder="Điện thoại" required value={employee.phone} onChange={e=>setEmployee({...employee,phone:e.target.value})}/>
    <input className={input} aria-label="Mật khẩu ban đầu" placeholder="Mật khẩu ban đầu" type="password" minLength={8} required value={employee.password} onChange={e=>setEmployee({...employee,password:e.target.value})}/>
    <select className={input} aria-label="Vai trò mới" value={employee.role} onChange={e=>setEmployee({...employee,role:e.target.value as EmployeeRole})}>{roles.map(r=><option key={r} value={r}>{employeeRoleLabel(r)}</option>)}</select>
    <button className={button} disabled={busy}>Thêm nhân viên</button>
   </form>
   <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full text-left"><thead><tr>{["Mã","Họ tên","Điện thoại","Vai trò","Thao tác"].map(h=><th className="p-3" key={h}>{h}</th>)}</tr></thead><tbody>{employees.map(e=>{const targetKey=`employee:${e.employee_id}`;return <tr key={`${e.employee_id}-${highlightedTarget===targetKey?focusTarget?.nonce??0:0}`} data-catalog-target={targetKey} className={`border-t border-slate-100 ${highlightedTarget===targetKey?"manager-catalog-highlight":""}`}><td className="p-3">{e.employee_id}</td><td>{e.full_name}</td><td>{e.phone}</td><td><select aria-label={`Vai trò ${e.employee_id}`} className={input} disabled={busy} value={e.role} onChange={event=>{const role=event.target.value;void save(()=>apiClient.request(`/api/auth/employees/${encodeURIComponent(e.employee_id)}/role`,{method:"PATCH",body:{role}}));}}>{roles.map(r=><option key={r} value={r}>{employeeRoleLabel(r)}</option>)}</select></td><td className="p-3">{e.employee_id!==currentEmployeeId&&<button type="button" className={button} disabled={busy} aria-label={`Xóa nhân viên ${e.employee_id}`} onClick={()=>{if(window.confirm(`Xóa nhân viên ${e.employee_id} khỏi danh sách hoạt động? Lịch sử đặt phòng và nhật ký nghiệp vụ sẽ được giữ lại.`))void save(()=>apiClient.request(`/api/auth/employees/${encodeURIComponent(e.employee_id)}`,{method:"DELETE"}),"Đã xóa nhân viên khỏi danh sách hoạt động.");}}>Xóa</button>}</td></tr>;})}</tbody></table></div>
  </>}
  {tab==="types"&&<>
   <form className="mb-5 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-4" onSubmit={e=>{e.preventDefault();void save(()=>apiClient.request(`/api/room-types${types.some(t=>t.id===type.id)?`/${encodeURIComponent(type.id)}`:""}`,{method:types.some(t=>t.id===type.id)?"PUT":"POST",body:type}));}}>
    <input className={input} aria-label="Mã loại phòng" placeholder="Mã loại phòng" required value={type.id} onChange={e=>setType({...type,id:e.target.value})}/>
    <input className={input} aria-label="Tên loại phòng" placeholder="Tên loại phòng" required value={type.name} onChange={e=>setType({...type,name:e.target.value})}/>
    <input className={input} aria-label="Giá ngày" type="number" min={1} required value={type.daily_price} onChange={e=>setType({...type,daily_price:Number(e.target.value)})}/>
    <input className={input} aria-label="Mô tả loại phòng" placeholder="Mô tả" value={type.description??""} onChange={e=>setType({...type,description:e.target.value})}/>
    <button className={button} disabled={busy}>Lưu loại phòng</button>
   </form>
   {types.map(t=><div key={t.id} className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"><span>{t.id} · {t.name} · {t.daily_price.toLocaleString("vi-VN")} ₫/ngày</span><button className={button} onClick={()=>setType(t)}>Sửa</button></div>)}
  </>}
  {tab==="rooms"&&<>
   <form className="mb-5 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-4" onSubmit={e=>{e.preventDefault();void save(()=>apiClient.request(`/api/rooms/admin${rooms.some(r=>r.id===room.id)?`/${encodeURIComponent(room.id)}`:""}`,{method:rooms.some(r=>r.id===room.id)?"PUT":"POST",body:{...room,name:room.id}}));}}>
    <input className={input} aria-label="Số phòng" placeholder="Số phòng" required value={room.id} onChange={e=>setRoom({...room,id:e.target.value})}/>
    <select className={input} aria-label="Loại phòng" value={room.room_type_id} onChange={e=>setRoom({...room,room_type_id:e.target.value})}>{types.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select>
    <input className={input} aria-label="Tầng" type="number" required value={room.floor} onChange={e=>setRoom({...room,floor:Number(e.target.value)})}/>
    <input className={input} aria-label="Mô tả phòng" placeholder="Mô tả" value={room.description??""} onChange={e=>setRoom({...room,description:e.target.value})}/>
    <button className={button} disabled={busy}>Lưu phòng</button>
   </form>
   {rooms.map(r=>{const targetKey=`room:${r.id}`;return <div key={r.id} data-catalog-target={targetKey} className={`mb-2 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 ${highlightedTarget===targetKey?"manager-catalog-highlight":""}`}><span>Phòng {r.id} · {r.room_type_id} · Tầng {r.floor}</span><button className={button} onClick={()=>setRoom(r)}>Sửa</button></div>;})}
  </>}
  {tab==="audit"&&<div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full text-left"><thead><tr>{["Thời điểm","Thao tác","Đối tượng","Mã"].map(h=><th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{audit.map(a=><tr key={a.id} className="border-t border-slate-100"><td className="p-3">{a.created_at}</td><td>{a.action}</td><td>{a.entity_type}</td><td>{a.entity_id}</td></tr>)}</tbody></table>{audit.length===0&&<p className="p-4">Chưa có nhật ký.</p>}</div>}
 </section>;
}
