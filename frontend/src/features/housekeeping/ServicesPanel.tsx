import { useEffect, useState, type FormEvent } from "react";
import { apiClient, apiErrorMessage } from "../../shared/api/client";
type Service={id:string;name:string;price:number;unit:string;description?:string};
type Usage={id:number;reservation_id:number;service_name:string;quantity:number;unit_price:number;amount:number;used_at:string;cancelled:boolean};
type Summary={reservation_id:number;room_ids:string[];guest_name:string;service_count:number;total_quantity:number;total_amount:number;usages:Usage[]};
const input="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
const button="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50";
export function ServicesPanel(){
 const [services,setServices]=useState<Service[]>([]);const [summaries,setSummaries]=useState<Summary[]>([]);const [selected,setSelected]=useState<number|null>(null);
 const [service,setService]=useState<Service>({id:"",name:"",price:0,unit:"lần",description:""});

 const [version,setVersion]=useState(0);const [busy,setBusy]=useState(false);const [loading,setLoading]=useState(true);const [error,setError]=useState("");const [notice,setNotice]=useState("");
 useEffect(()=>{let active=true;setLoading(true);Promise.all([apiClient.request<Service[]>("/api/services"),apiClient.request<Summary[]>("/api/service-usages/summary")]).then(([s,rows])=>{if(active){setServices(s);setSummaries(rows);setError("");}}).catch(e=>{if(active)setError(apiErrorMessage(e,"Không thể tải dịch vụ."));}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[version]);
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
  <h2 className="mb-3 text-lg font-semibold">Các phòng đã dùng dịch vụ</h2>
  <p className="mb-4 text-slate-500">Tổng hợp theo từng lượt lưu trú. Số lượt ghi, tổng số lượng và tổng tiền chỉ tính dịch vụ chưa hủy. Lễ tân thực hiện ghi nhận và hủy dịch vụ.</p>
  <button className={`${button} mb-3`} disabled={loading} onClick={()=>setVersion(v=>v+1)}>Làm mới danh sách</button>
  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
   <table className="w-full text-left"><thead><tr>{["Phòng","Khách lưu trú","Phiếu đặt","Số lượt ghi dịch vụ","Tổng số lượng","Tổng tiền dịch vụ", ""].map((h,i)=><th key={i} className="p-3">{h}</th>)}</tr></thead>
    <tbody>{summaries.map(row=><tr key={row.reservation_id} className="border-t border-slate-100">
     <td className="p-3">{row.room_ids.join(", ")}</td><td>{row.guest_name}</td><td>#{row.reservation_id}</td><td>{row.service_count}</td><td>{row.total_quantity}</td><td>{row.total_amount.toLocaleString("vi-VN")} ₫</td>
     <td><button className={button} aria-label={`Xem chi tiết phiếu #${row.reservation_id}`} onClick={()=>setSelected(row.reservation_id)}>Xem chi tiết</button></td>
    </tr>)}</tbody>
   </table>{!summaries.length&&!loading&&<p className="p-4 text-slate-500">Chưa có phòng sử dụng dịch vụ.</p>}
  </div>
  {summaries.filter(row=>row.reservation_id===selected).map(row=><section key={row.reservation_id} role="region" aria-label="Chi tiết dịch vụ" className="mt-5 rounded-xl border border-blue-200 bg-white p-4">
   <div className="mb-3 flex items-center justify-between gap-3"><h3 className="font-semibold">Chi tiết dịch vụ · Phòng {row.room_ids.join(", ")} · Phiếu #{row.reservation_id}</h3><button className={button} onClick={()=>setSelected(null)}>Đóng chi tiết</button></div>
   <p className="mb-3">Khách: {row.guest_name} · Tổng tiền dịch vụ chưa hủy: <strong>{row.total_amount.toLocaleString("vi-VN")} ₫</strong></p>
   <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr>{["Dịch vụ","Số lượng","Đơn giá đã chốt","Thành tiền","Thời điểm ghi","Trạng thái"].map(h=><th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>
    {row.usages.map(u=><tr key={u.id} className="border-t border-slate-100"><td className="p-3">{u.service_name}</td><td>{u.quantity}</td><td>{u.unit_price.toLocaleString("vi-VN")} ₫</td><td>{u.amount.toLocaleString("vi-VN")} ₫</td><td>{new Date(u.used_at).toLocaleString("vi-VN")}</td><td className={u.cancelled?"text-slate-500":"text-green-700"}>{u.cancelled?"Đã hủy — không tính tiền":"Đã ghi nhận"}</td></tr>)}
   </tbody></table></div>
  </section>)}
 </section>;
}
