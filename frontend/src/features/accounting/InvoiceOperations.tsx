import { useEffect, useState } from "react";
import { financeApi as api, newFinanceIdempotencyKey } from "../../shared/api/finance";
import { apiErrorMessage } from "../../shared/api/client";
import type { Invoice, Payment, Receipt, PaymentMethod, Page } from "../../shared/types/hotelOperations";
import { formatVnd } from "../../shared/utils/money";
import { invoiceStatusLabel, invoiceTotal } from "./accountingLogic";
import { AccountingDocument, receiptDocument } from "./AccountingDocument";
import { compactActionStyle } from "./accountingUi";

export default function InvoiceOperations({refresh,search,onChanged}:{refresh:number;search:string;onChanged:()=>void}) {
 const [page,setPage]=useState(0);const [data,setData]=useState<Page<Invoice>|null>(null);const [selected,setSelected]=useState<Invoice|null>(null);
 const [payments,setPayments]=useState<Payment[]>([]);const [receipts,setReceipts]=useState<Receipt[]>([]);const [document,setDocument]=useState<Receipt|null>(null);
 const [error,setError]=useState("");const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [detailsLoading,setDetailsLoading]=useState(false);
 const [amount,setAmount]=useState("");const [method,setMethod]=useState<PaymentMethod>("CASH");
 useEffect(()=>{setPage(0);setSelected(null);},[search]);
 useEffect(()=>{let active=true;setLoading(true);setError("");const reservation=search.trim()?Number(search.trim()):undefined;
  if(reservation!==undefined&&(!Number.isSafeInteger(reservation)||reservation<=0)){setError("Nhập mã booking bằng số để tìm hóa đơn.");setLoading(false);return;}
  api.invoices({page,size:10,reservation_id:reservation}).then(r=>{if(active){setData(r);setSelected(old=>old?r.items.find(i=>i.id===old.id)??null:null);}}).catch(e=>{if(active)setError(apiErrorMessage(e,"Không thể tải hóa đơn."));}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[page,refresh,search]);
 useEffect(()=>{let active=true;setPayments([]);setReceipts([]);if(!selected)return;setDetailsLoading(true);
  Promise.all([api.invoicePayments(selected.id),api.invoiceReceipts(selected.id)]).then(([p,r])=>{if(active){setPayments(Array.isArray(p)?p:p.items);setReceipts(Array.isArray(r)?r:r.items);}}).catch(e=>{if(active)setError(apiErrorMessage(e,"Không thể tải giao dịch và biên lai."));}).finally(()=>{if(active)setDetailsLoading(false);});return()=>{active=false;};},[selected?.id,refresh]);
 async function collect(e:React.FormEvent){e.preventDefault();if(!selected||busy)return;setBusy(true);setError("");try{await api.recordPayment(selected.id,{amount:Number(amount),method,type:"PAYMENT"},newFinanceIdempotencyKey());setAmount("");onChanged();}catch(cause){setError(apiErrorMessage(cause,"Không thể ghi nhận thanh toán."));}finally{setBusy(false);}}
 return <section className="acct-panel" style={{padding:22,background:"#FFF",border:"1px solid #E2E8F0",borderRadius:12}}>
  <h2 style={{fontSize:18,fontWeight:600}}>Hóa đơn thanh toán</h2>
  <p className="my-3 text-sm text-slate-500">Tra hóa đơn, ghi nhận khoản còn phải thu và in biên lai.</p>
  {error&&<p role="alert" className="mb-3 text-red-700">{error} <button onClick={onChanged}>Tải lại</button></p>}{loading&&<p role="status">Đang tải hóa đơn…</p>}
  <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{["Hóa đơn","Booking","Tổng tiền","Còn phải thu","Trạng thái",""].map((t,i)=><th key={i} className="p-3">{t}</th>)}</tr></thead><tbody>{!loading&&data?.items.map(i=><tr key={i.id} className="border-t border-slate-100"><td className="p-3">INV-{i.id}</td><td>#{i.reservation_id}</td><td>{formatVnd(invoiceTotal(i))}</td><td>{formatVnd(i.payable)}</td><td>{invoiceStatusLabel(i)}</td><td><button style={compactActionStyle} onClick={()=>setSelected(i)}>Chi tiết</button></td></tr>)}</tbody></table></div>
  {!loading&&data?.items.length===0&&<p className="p-4 text-slate-500">Chưa có hóa đơn.</p>}
  <div className="my-4 flex items-center gap-3"><button style={compactActionStyle} disabled={page===0||loading} onClick={()=>setPage(p=>p-1)}>Trước</button><span>Trang {page+1}/{Math.max(1,data?.totalPages??1)}</span><button style={compactActionStyle} disabled={loading||page+1>=(data?.totalPages??1)} onClick={()=>setPage(p=>p+1)}>Sau</button></div>
  {selected&&<div className="acct-details-card rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
   <div className="flex items-center justify-between"><h3>INV-{selected.id} · Booking #{selected.reservation_id}</h3><button style={compactActionStyle} onClick={()=>setSelected(null)}>Đóng chi tiết</button></div>
   <p className="my-3">Tổng {formatVnd(invoiceTotal(selected))} · Còn phải thu {formatVnd(selected.payable)}</p>
   {selected.payable>0&&<form className="mb-4 flex flex-wrap gap-2" onSubmit={collect}><input className="rounded-lg border border-slate-300 px-3 py-2" aria-label="Số tiền thu" type="number" min={1} max={selected.payable} step={1} required value={amount} onChange={e=>setAmount(e.target.value)}/><select className="rounded-lg border border-slate-300 px-3 py-2" aria-label="Phương thức thanh toán" value={method} onChange={e=>setMethod(e.target.value as PaymentMethod)}><option value="CASH">Tiền mặt</option><option value="CARD">Thẻ</option><option value="BANK_TRANSFER">Chuyển khoản</option></select><button style={compactActionStyle} disabled={busy||detailsLoading}>Ghi nhận thanh toán</button></form>}
   {detailsLoading?<p role="status">Đang tải giao dịch…</p>:<><h4>Giao dịch đã thu</h4>{payments.map(p=><p className="my-2" key={p.id}>PAY-{p.id} · {formatVnd(p.amount)} · {p.occurred_at}</p>)}<h4 className="mt-4">Biên lai</h4>{receipts.map(r=><div key={r.id} className="my-2 flex items-center gap-3"><span>{r.receipt_number} · {formatVnd(r.amount)}</span><button style={compactActionStyle} onClick={()=>setDocument(r)}>In biên lai</button></div>)}</>}
  </div>}
  {document&&<AccountingDocument data={receiptDocument(document)} onClose={()=>setDocument(null)}/>}
 </section>;
}
