import { useEffect, useState, type FormEvent } from "react";
import { apiClient, apiErrorMessage } from "../../shared/api/client";
type Service={id:string;name:string;price:number;unit:string;description?:string};
type Usage={id:number;reservation_id:number;service_name:string;quantity:number;amount:number;cancelled:boolean};
type Stay={id:number;rooms:{room_id:string}[]};
const input="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
const button="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50";
export function ServicesPanel(){
 const [services,setServices]=useState<Service[]>([]);const [usages,setUsages]=useState<Usage[]>([]);const [stays,setStays]=useState<Stay[]>([]);
 const [service,setService]=useState<Service>({id:"",name:"",price:0,unit:"lần",description:""});
 const [reservation,setReservation]=useState("");const [serviceId,setServiceId]=useState("");const [quantity,setQuantity]=useState(1);
 const [version,setVersion]=useState(0);const [busy,setBusy]=useState(false);const [loading,setLoading]=useState(true);const [error,setError]=useState("");const [notice,setNotice]=useState("");
 useEffect(()=>{let active=true;setLoading(true);Promise.all([apiClient.request<Service[]>("/api/services"),apiClient.request<Usage[]>("/api/service-usages"),apiClient.request<{items:Stay[]}>("/api/reservations?status=CHECKED_IN&size=100")]).then(([s,u,r])=>{if(active){setServices(s);setUsages(u);setStays(r.items);setError("");}}).catch(e=>{if(active)setError(apiErrorMessage(e,"Không thể tải dịch vụ."));}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[version]);
 async function act(action:()=>Promise<unknown>){if(busy)return;setBusy(true);setError("");setNotice("");try{await action();setNotice("Đã lưu.");setVersion(v=>v+1);}catch(e){setError(apiErrorMessage(e,"Không thể lưu dịch vụ."));}finally{setBusy(false);}}
 function save(e:FormEvent){e.preventDefault();void act(()=>apiClient.request(`/api/services${services.some(s=>s.id===service.id)?`/${encodeURIComponent(service.id)}`:""}`,{method:services.some(s=>s.id===service.id)?"PUT":"POST",body:service}));}
 return <section className="overflow-y-auto p-5 text-sm">
  {error&&<p role="alert" className="mb-3 text-red-700">{error} <button onClick={()=>setVersion(v=>v+1)}>Tải lại</button></p>}{notice&&<p role="status" className="mb-3 text-green-700">{notice}</p>}{loading&&<p role="status">Đang tải…</p>}
  <h2 className="mb-3 text-lg font-semibold">Danh mục dịch vụ</h2>
  <form className="mb-4 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-4" onSubmit={save}>
   <input className={input} aria-label="Mã dịch vụ" placeholder="Mã dịch vụ" required value={service.id} onChange={e=>setService({...service,id:e.target.value})}/>
   <input className={input} aria-label="Tên dịch vụ" placeholder="Tên dịch vụ" required value={service.name} onChange={e=>setService({...service,name:e.target.value})}/>
   <input className={input} aria-label="Giá dịch vụ" type="number" min={0} required value={service.price} onChange={e=>setService({...service,price:Number(e.target.value)})}/>
   <input className={input} aria-label="Đơn vị tính" placeholder="Đơn vị tính" required value={service.unit} onChange={e=>setService({...service,unit:e.target.value})}/>
   <button className={button} disabled={busy}>Lưu dịch vụ</button>
  </form>
  <div className="mb-6 overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full text-left"><thead><tr>{["Mã","Dịch vụ","Giá",""].map((h,i)=><th key={i} className="p-3">{h}</th>)}</tr></thead><tbody>{services.map(s=><tr key={s.id} className="border-t border-slate-100"><td className="p-3">{s.id}</td><td>{s.name}</td><td>{s.price.toLocaleString("vi-VN")} ₫/{s.unit}</td><td><button className={button} onClick={()=>setService(s)}>Sửa</button></td></tr>)}</tbody></table></div>
  <h2 className="mb-3 text-lg font-semibold">Ghi dịch vụ đã dùng</h2>
  <form className="mb-4 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-4" onSubmit={e=>{e.preventDefault();void act(()=>apiClient.request("/api/service-usages",{method:"POST",body:{reservation_id:Number(reservation),service_id:serviceId,quantity}}));}}>
   <select className={input} aria-label="Phòng đang ở" required value={reservation} onChange={e=>setReservation(e.target.value)}><option value="">Chọn phòng đang ở</option>{stays.map(s=><option key={s.id} value={s.id}>Phòng {s.rooms.map(r=>r.room_id).join(", ")} · #{s.id}</option>)}</select>
   <select className={input} aria-label="Dịch vụ sử dụng" required value={serviceId} onChange={e=>setServiceId(e.target.value)}><option value="">Chọn dịch vụ</option>{services.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
   <input className={input} aria-label="Số lượng" type="number" min={1} step={1} required value={quantity} onChange={e=>setQuantity(Number(e.target.value))}/><button className={button} disabled={busy||!stays.length}>Ghi sử dụng</button>
  </form>
  {!stays.length&&!loading&&<p className="mb-3 text-slate-500">Chưa có phòng đang ở.</p>}
  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full text-left"><thead><tr>{["Booking","Dịch vụ","Số lượng","Thành tiền",""].map((h,i)=><th key={i} className="p-3">{h}</th>)}</tr></thead><tbody>{usages.map(u=><tr key={u.id} className="border-t border-slate-100"><td className="p-3">#{u.reservation_id}</td><td>{u.service_name}</td><td>{u.quantity}</td><td>{u.amount.toLocaleString("vi-VN")} ₫</td><td>{u.cancelled?"Đã hủy":<button className={button} disabled={busy} onClick={()=>void act(()=>apiClient.request(`/api/service-usages/${u.id}`,{method:"DELETE"}))}>Hủy sử dụng</button>}</td></tr>)}</tbody></table>{!usages.length&&<p className="p-4 text-slate-500">Chưa có dịch vụ sử dụng.</p>}</div>
 </section>;
}
