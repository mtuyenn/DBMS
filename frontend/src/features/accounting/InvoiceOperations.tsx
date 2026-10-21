import { useEffect, useState } from "react";
import { financeApi as api, newFinanceIdempotencyKey } from "../../shared/api/finance";
import { apiErrorMessage } from "../../shared/api/client";
import type { Invoice, Payment, Receipt, PaymentMethod, Page, UnissuedTransaction } from "../../shared/types/hotelOperations";
import { formatVnd } from "../../shared/utils/money";
import { invoiceStatusLabel, invoiceTotal } from "./accountingLogic";
import { AccountingDocument, receiptDocument } from "./AccountingDocument";
import { compactActionStyle } from "./accountingUi";
import { Receipt as ReceiptIcon, AlertCircle, CheckCircle2, Printer, RefreshCw } from "lucide-react";

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


/* Sổ biên lai và đối soát giao dịch còn thiếu biên lai. */
function methodBadge(m: string) {
  const map: Record<string, { label: string; bg: string; text: string }> = {
    CASH: { label: "Tiền mặt", bg: "#DCFCE7", text: "#166534" },
    CARD: { label: "Thẻ", bg: "#FFE4E6", text: "#BE123C" },
    BANK_TRANSFER: { label: "Chuyển khoản", bg: "#EDE9FE", text: "#5B21B6" },
    MOMO: { label: "Ví MoMo", bg: "#FCE7F3", text: "#9D174D" },
  };
  const cfg = map[m] ?? { label: m, bg: "#F1F5F9", text: "#475569" };
  return (
    <span style={{ fontSize: 12, padding: "3px 8px", borderRadius: 6, fontWeight: 500, background: cfg.bg, color: cfg.text }}>
      {cfg.label}
    </span>
  );
}

export function ReceiptOperations({ refresh, search, onChanged }: { refresh: number; search: string; onChanged: () => void }) {
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Page<Receipt> | null>(null);
  const [unissued, setUnissued] = useState<UnissuedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [unissuedLoading, setUnissuedLoading] = useState(true);
  const [unissuedError, setUnissuedError] = useState("");
  const [error, setError] = useState("");
  const [document, setDocument] = useState<Receipt | null>(null);

  useEffect(() => { setPage(0); }, [search]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const invId = search.trim() ? Number(search.trim()) : undefined;
    if (invId !== undefined && (!Number.isSafeInteger(invId) || invId <= 0)) {
      setData(null);
      setError("Nhập mã hóa đơn bằng số nguyên dương để tìm biên lai.");
      setLoading(false);
      return;
    }
    api.receipts({ page, size: 10, invoice_id: invId })
      .then(r => { if (active) setData(r); })
      .catch(e => { if (active) setError(apiErrorMessage(e, "Không thể tải danh sách biên lai.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, refresh, search]);

  useEffect(() => {
    let active = true;
    setUnissuedLoading(true);
    setUnissuedError("");
    api.unissuedReceipts()
      .then(res => { if (active) setUnissued(res); })
      .catch(cause => { if (active) setUnissuedError(apiErrorMessage(cause, "Không thể kiểm tra giao dịch chưa lập biên lai.")); })
      .finally(() => { if (active) setUnissuedLoading(false); });
    return () => { active = false; };
  }, [refresh]);

  return (
    <div className="flex flex-col gap-6" style={{ padding: 4 }}>
      {/* Unissued Transactions Notification / Section */}
      <div style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 22 }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} style={{ color: unissued.length > 0 ? "#D97706" : "#059669" }} />
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>
              Giao dịch chưa lập biên lai
            </h3>
          </div>
          {!unissuedLoading && !unissuedError && <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 12, background: unissued.length > 0 ? "#FEF3C7" : "#ECFDF5", color: unissued.length > 0 ? "#92400E" : "#065F46", fontWeight: 600 }}>
            {unissued.length} giao dịch chờ
          </span>}
        </div>

        <p className="mb-3 text-sm text-slate-500">Biên lai được phát hành tự động khi thu tiền. Danh sách này giúp đối soát các giao dịch còn thiếu biên lai.</p>
        {unissuedLoading && <p role="status" className="text-slate-500 text-sm">Đang kiểm tra giao dịch…</p>}
        {unissuedError && <p role="alert" className="text-sm text-red-700">{unissuedError} <button onClick={onChanged}>Thử lại</button></p>}

        {!unissuedLoading && !unissuedError && unissued.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 p-3 rounded-lg border border-emerald-100">
            <CheckCircle2 size={16} />
            <span>Toàn bộ các giao dịch thanh toán hoàn tất đều đã được phát hành biên lai hợp lệ.</span>
          </div>
        )}

        {!unissuedLoading && !unissuedError && unissued.length > 0 && (
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="p-2">Mã GD</th>
                  <th className="p-2">Hóa đơn</th>
                  <th className="p-2">Số tiền</th>
                  <th className="p-2">Phương thức</th>
                </tr>
              </thead>
              <tbody>
                {unissued.map(u => (
                  <tr key={u.transaction_id} className="border-b border-slate-100">
                    <td className="p-2 font-mono text-slate-800">GD-{u.transaction_id}</td>
                    <td className="p-2">INV-{u.invoice_id}</td>
                    <td className="p-2 font-semibold text-emerald-600">{formatVnd(u.amount)}</td>
                    <td className="p-2">{methodBadge(u.method)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Main Receipts Ledger Section */}
      <div style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 22 }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ReceiptIcon size={18} style={{ color: "#2563EB" }} />
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>Sổ biên lai thu tiền</h2>
          </div>
          <button style={compactActionStyle} onClick={onChanged}>
            <RefreshCw size={14} /> Tải lại
          </button>
        </div>
        <p className="mb-4 text-sm text-slate-500">Tra cứu các chứng từ biên lai thu tiền đã được cấp và hỗ trợ in ấn chứng từ.</p>

        {error && <p role="alert" className="mb-3 text-red-700">{error} <button onClick={onChanged}>Tải lại</button></p>}
        {loading && <p role="status" className="text-slate-500">Đang tải biên lai…</p>}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="p-3">Mã biên lai</th>
                <th className="p-3">Số biên lai</th>
                <th className="p-3">Hóa đơn</th>
                <th className="p-3">Số tiền</th>
                <th className="p-3">Phương thức</th>
                <th className="p-3">Thời điểm phát hành</th>
                <th className="p-3">In ấn</th>
              </tr>
            </thead>
            <tbody>
              {!loading && !error && data?.items.map(r => (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="p-3 font-mono font-medium text-slate-800">BL-{r.id}</td>
                  <td className="p-3">{r.receipt_number}</td>
                  <td className="p-3">INV-{r.invoice_id}</td>
                  <td className="p-3 font-semibold text-emerald-600">{formatVnd(r.amount)}</td>
                  <td className="p-3">{methodBadge(r.method)}</td>
                  <td className="p-3 text-slate-500">{r.issued_at}</td>
                  <td className="p-3">
                    <button style={compactActionStyle} onClick={() => setDocument(r)}>
                      <Printer size={14} /> In biên lai
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && !error && data?.items.length === 0 && (
          <p className="p-6 text-center text-slate-500">Chưa có biên lai nào được phát hành.</p>
        )}

        <div className="my-4 flex items-center gap-3">
          <button style={compactActionStyle} disabled={page === 0 || loading || !!error} onClick={() => setPage(p => p - 1)}>
            Trước
          </button>
          <span>Trang {page + 1}/{Math.max(1, data?.totalPages ?? 1)}</span>
          <button style={compactActionStyle} disabled={loading || !!error || page + 1 >= (data?.totalPages ?? 1)} onClick={() => setPage(p => p + 1)}>
            Sau
          </button>
        </div>
      </div>

      {document && <AccountingDocument data={receiptDocument(document)} onClose={() => setDocument(null)} />}
    </div>
  );
}
