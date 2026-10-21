import { useEffect, useState } from "react";
import { apiClient, apiErrorMessage } from "../../shared/api/client";

type Usage = { id:number; service_name:string; quantity:number; amount:number; cancelled:boolean };
export function ServiceUsageHistory({reservationId, refreshKey, locked, checkingInvoice=false, onChanged}: {
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
