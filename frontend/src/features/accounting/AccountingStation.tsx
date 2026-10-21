import InvoiceOperations from "./InvoiceOperations";
import RevenueDashboard from "./RevenueDashboard";
import ReceiptOperations from "./ReceiptOperations";
import { useEffect, useState } from "react";
import { financeApi } from "../../shared/api/finance";
import { authApi } from "../../shared/api/auth";
import { apiErrorMessage, ApiError } from "../../shared/api/client";
import { AccountingWorkspace, type AccountingPage } from "./AccountingWorkspace";
import type { LedgerPayment, PaymentMethod, PaymentPage } from "../../shared/types/hotelOperations";
import type { EmployeeProfileDto } from "../../shared/types/api";
import { formatDateVi } from "../../shared/utils/localDate";
import { businessDateValue } from "./accountingLogic";
import { compactActionStyle } from "./accountingUi";
import { formatVnd } from "../../shared/utils/money";
import { Search, ChevronDown, Download, ChevronLeft, ChevronRight } from "lucide-react";


/* ══════════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════════ */
type LedgerTab = "all" | "cash" | "card" | "vietqr" | "momo" | "other";
type PayStatus = "paid" | "refunded" | "failed" | "voided";
interface PaymentLedgerEntry {
  id: string;
  invoiceId: string;
  reservationId: number | "—";
  description: string;
  amount: number;
  method: string;
  methodType: LedgerTab;
  time: string;
  status: PayStatus;
  ledgerTab: LedgerTab[];
}
/* ══════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════ */
const fmtMoney = formatVnd;

const METHOD_CFG: Record<string,{bg:string;text:string;label:string}> = {
  visa:    { bg:"#DBEAFE",text:"#1D4ED8",label:"VISA" },
  card:    { bg:"#FFE4E6",text:"#BE123C",label:"Thẻ" },
  cash:    { bg:"#DCFCE7",text:"#166534",label:"Tiền mặt" },
  vietqr:  { bg:"#EDE9FE",text:"#5B21B6",label:"Chuyển khoản" },
  momo:    { bg:"#FCE7F3",text:"#9D174D",label:"Ví MoMo" },
  other:   { bg:"#F1F5F9",text:"#475569",label:"Khác" },
};

function LedgerPanel({ fillHeight = false, date = businessDateValue(), onDateChange, search = "", onSearchChange, refresh = 0 }: { fillHeight?: boolean; date?: string; onDateChange: (date: string) => void; search?: string; onSearchChange: (value: string) => void; refresh?: number }) {
  const [lTab, setLTab] = useState<LedgerTab>("all");
  const [page, setPage] = useState(1);
  const searchQuery = search;
  const [paymentPage, setPaymentPage] = useState<PaymentPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const PER_PAGE = 10;
  const currentDateLabel = formatDateVi(date);
  const today = date;
  useEffect(()=>{setPage(1);},[search,date]);
  const methods: Record<Exclude<LedgerTab, "all">, PaymentMethod> = { cash:"CASH", card:"CARD", vietqr:"BANK_TRANSFER", momo:"MOMO", other:"OTHER" };
  const method = lTab === "all" ? undefined : methods[lTab];

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setExportError("");
    financeApi.payments({ from:today, to:today, page:page-1, size:PER_PAGE, method, search:searchQuery.trim() || undefined })
      .then(result => {
        if (!active) return;
        if (result.page !== page-1) throw new ApiError(502,{code:"INVALID_PAGE_RESPONSE",message:"Máy chủ trả sai trang giao dịch. Vui lòng tải lại."});
        if (page > Math.max(1,result.totalPages)) { setPage(Math.max(1,result.totalPages)); return; }
        setPaymentPage(result);
      })
      .catch(cause => { if (active) setError(apiErrorMessage(cause,"Không thể tải giao dịch thanh toán.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, method, searchQuery, today, reload, refresh]);

  const toLedgerRow = (payment: LedgerPayment): PaymentLedgerEntry => {
      const methodType: LedgerTab = payment.method === "CASH" ? "cash"
        : payment.method === "CARD" ? "card"
        : payment.method === "BANK_TRANSFER" ? "vietqr"
        : payment.method === "MOMO" ? "momo" : "other";
      const status: PayStatus = payment.status === "COMPLETED"
        ? payment.type === "REFUND" ? "refunded" : "paid"
        : payment.status === "VOIDED" ? "voided" : "failed";
      const occurredAt = new Date(payment.occurred_at);
      return {
        id: `PAY-${payment.id}`,
        invoiceId: `INV-${payment.invoice_id}`,
        reservationId: payment.reservation_id,
        description: payment.type === "REFUND" ? "Hoàn tiền" : payment.service_total > 0 ? "Phòng & dịch vụ" : "Tiền phòng",
        amount: payment.amount,
        method: payment.method,
        methodType,
        time: Number.isNaN(occurredAt.getTime()) ? "—" : occurredAt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        status,
        ledgerTab: ["all", methodType],
      };
  };
  const pageRows = loading || error ? [] : (paymentPage?.items ?? []).map(toLedgerRow);
  const totalElements = paymentPage?.totalElements ?? 0;
  const totalPages = Math.max(1,paymentPage?.totalPages ?? 0);
  const methodCounts = paymentPage?.methodCounts ?? {};
  const pageNumbers = [...new Set([1,Math.max(1,page-1),page,Math.min(totalPages,page+1),totalPages])].sort((a,b)=>a-b);

  const TABS: { id:LedgerTab; label:string; count:number }[] = [
    { id:"all",     label:"Tất cả",        count:Object.values(methodCounts).reduce((sum,count)=>sum+(count ?? 0),0) },
    { id:"cash",    label:"Tiền mặt",       count:methodCounts.CASH ?? 0 },
    { id:"card",    label:"Thẻ",            count:methodCounts.CARD ?? 0 },
    { id:"vietqr",  label:"Chuyển khoản",  count:methodCounts.BANK_TRANSFER ?? 0 },
    { id:"momo", label:"Ví MoMo", count:methodCounts.MOMO ?? 0 },
    { id:"other", label:"Khác", count:methodCounts.OTHER ?? 0 },
  ];

  const STATUS_CFG: Record<PayStatus,{label:string;bg:string;text:string;dot:string}> = {
    paid:     { label:"Đã thanh toán",     bg:"#DCFCE7",text:"#166534",dot:"#16A34A" },
    refunded: { label:"Đã hoàn tiền", bg:"#FEF9C3",text:"#92400E",dot:"#F59E0B" },
    failed:   { label:"Thất bại", bg:"#FFE4E6",text:"#BE123C",dot:"#E11D48" },
    voided:   { label:"Đã hủy", bg:"#F1F5F9",text:"#64748B",dot:"#94A3B8" },
  };

  const exportRows = async () => {
    setExporting(true);
    setExportError("");
    try {
    const payments: LedgerPayment[] = [];
    let pages = 1;
    let expectedTotal: number | undefined;
    const ids = new Set<number>();
    for (let index=0; index<pages; index++) {
      const result = await financeApi.payments({ from:today, to:today, method, search:searchQuery.trim() || undefined, page:index, size:100 });
      if (result.page !== index || (expectedTotal !== undefined && result.totalElements !== expectedTotal)
          || (result.items.length === 0 && payments.length < result.totalElements)
          || result.items.some(row=>ids.has(row.id))) throw new ApiError(502,{code:"EXPORT_DATA_CHANGED",message:"Dữ liệu giao dịch đã thay đổi hoặc trả thiếu khi xuất. Vui lòng thử lại."});
      expectedTotal = result.totalElements;
      result.items.forEach(row=>ids.add(row.id));
      payments.push(...result.items);
      pages = result.totalPages;
    }
    if (payments.length !== expectedTotal) throw new ApiError(502,{code:"EXPORT_INCOMPLETE",message:"Chưa tải đủ giao dịch để xuất CSV. Vui lòng thử lại."});
    const escapeCsv = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const rows = [
      ["transaction_id", "invoice_id", "reservation_id", "type", "amount", "method", "occurred_at", "status", "reference"],
      ...payments.map(source => {
        const row = toLedgerRow(source);
        return [row.id, row.invoiceId, row.reservationId, row.description, row.amount, row.method, source?.occurred_at ?? "", row.status, source?.reference ?? ""];
      }),
    ].map(row => row.map(escapeCsv).join(","));
    const url = URL.createObjectURL(new Blob([`\uFEFF${rows.join("\r\n")}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `payments-${date}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) { setExportError(apiErrorMessage(cause,"Không thể xuất giao dịch CSV.")); }
    finally { setExporting(false); }
  };

  return (
    <div className="acct-card acct-ledger" style={{ flex:fillHeight?"1 1 100%":"1 1 50%",minWidth:0,minHeight:0,display:"flex",flexDirection:"column",
      background:"#FFF",borderRadius:12,border:"1px solid #E2E8F0",overflow:"hidden" }}>
      {/* Header */}
      <div className="acct-card-header" style={{ padding:"16px 18px",borderBottom:"1px solid #E2E8F0",
        display:"flex",alignItems:"flex-start",justifyContent:"space-between" }}>
        <div>
          <p style={{ fontSize:14,fontWeight:700,color:"#0F172A",marginBottom:2 }}>Sổ giao dịch thanh toán</p>
          <p style={{ fontSize:11,color:"#94A3B8" }}>Giao dịch thực tế ghi nhận ngày {currentDateLabel}</p>
        </div>
        <button disabled={exporting || loading} onClick={() => void exportRows()} style={{ display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:8,
          border:"1px solid #E2E8F0",background:"#F8FAFC",color:"#334155",fontSize:11,
          fontWeight:600,cursor:"pointer" }}>
          <Download size={12} /> {exporting ? "Đang xuất…" : "Xuất giao dịch CSV"}
        </button>
      </div>

      {/* Search row */}
      <div className="acct-ledger-filters" style={{ padding:"10px 18px",borderBottom:"1px solid #F1F5F9",
        display:"flex",gap:8,alignItems:"center" }}>
        <div style={{ position:"relative",flex:1 }}>
          <Search size={12} style={{ position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:"#94A3B8",pointerEvents:"none" }} />
          <input value={searchQuery} maxLength={200} onChange={event => { onSearchChange(event.target.value); setPage(1); }} placeholder="Tìm mã giao dịch, hóa đơn hoặc đặt phòng..."
            style={{ width:"100%",height:30,paddingLeft:28,paddingRight:8,borderRadius:7,
              border:"1px solid #E2E8F0",background:"#F8FAFC",fontSize:11,outline:"none",boxSizing:"border-box" }} />
        </div>
        <label className="acct-ledger-date"><span>Ngày giao dịch</span><input aria-label="Ngày tra cứu giao dịch" type="date" value={date} onChange={event=>{if(event.target.value){setPage(1);onDateChange(event.target.value);}}}/></label>
        <button type="button" style={compactActionStyle} disabled={date===businessDateValue()} onClick={()=>onDateChange(businessDateValue())}>Hôm nay</button>
        <div style={{ position:"relative" }}>
          <select aria-label="Phương thức thanh toán" value={lTab} onChange={event => { setLTab(event.target.value as LedgerTab); setPage(1); }} style={{ height:30,padding:"0 22px 0 8px",borderRadius:7,border:"1px solid #E2E8F0",
            background:"#F8FAFC",fontSize:11,outline:"none",cursor:"pointer",appearance:"none" }}>
            <option value="all">Tất cả phương thức</option>
            <option value="cash">Tiền mặt</option><option value="card">Thẻ</option>
            <option value="vietqr">Chuyển khoản</option><option value="momo">Ví MoMo</option><option value="other">Khác</option>
          </select>
          <ChevronDown size={10} style={{ position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",color:"#94A3B8",pointerEvents:"none" }} />
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="acct-ledger-tabs" style={{ display:"flex",padding:"0 18px",borderBottom:"1px solid #E2E8F0",gap:0 }}>
        {TABS.map(t => {
          const act = lTab === t.id;
          return (
            <button key={t.id} onClick={() => { setLTab(t.id); setPage(1); }}
              style={{ padding:"8px 12px",fontSize:12,fontWeight:act?600:400,cursor:"pointer",
                color:act?"#0F172A":"#64748B",background:"transparent",
                borderBottom:act?"2px solid #0F172A":"2px solid transparent",
                whiteSpace:"nowrap",marginBottom:-1 }}>
              {t.label} <span style={{ fontSize:10,marginLeft:3,
                background:act?"#0F172A":"#F1F5F9",color:act?"#FFF":"#64748B",
                padding:"1px 5px",borderRadius:99 }}>{t.count}</span>
            </button>
          );
        })}
      </div>

      {error && <div role="alert" style={{padding:"12px 18px",color:"#B91C1C"}}>{error} <button type="button" style={compactActionStyle} onClick={()=>setReload(value=>value+1)}>Tải lại giao dịch</button></div>}
      {exportError && <div role="alert" style={{padding:"12px 18px",color:"#B91C1C"}}>{exportError}</div>}
      {/* Table */}
      <div className="acct-table-wrap" style={{ flex:1,overflow:"auto" }}>
        <table className="acct-table" style={{ width:"100%",borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"#F8FAFC" }}>
              {["Mã giao dịch","Mã đặt phòng","Mã hóa đơn","Loại giao dịch","Số tiền","Phương thức","Giờ giao dịch","Trạng thái"].map(h => (
                <th key={h} style={{ padding:"8px 10px",fontSize:10,fontWeight:700,color:"#64748B",
                  textAlign:"left",letterSpacing:"0.04em",textTransform:"uppercase",
                  whiteSpace:"nowrap",borderBottom:"1px solid #E2E8F0" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} style={{padding:28,textAlign:"center"}}>Đang tải giao dịch…</td></tr>}
            {!loading && !error && pageRows.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding:"28px 12px",textAlign:"center",fontSize:12,color:"#94A3B8" }}>
                  Chưa có giao dịch thanh toán phù hợp trong ngày đã chọn.
                </td>
              </tr>
            )}
            {pageRows.map((entry,i) => {
              const mc  = METHOD_CFG[entry.methodType] ?? { bg:"#F1F5F9",text:"#475569",label:entry.method };
              const sc  = STATUS_CFG[entry.status];
              return (
                <tr key={entry.id} style={{ borderBottom:"1px solid #F8FAFC",background:i%2===0?"#FFF":"#FAFAFA" }}>
                  <td style={{ padding:"7px 10px",fontSize:10,fontWeight:600,color:"#2563EB",
                    fontFamily:"'JetBrains Mono',monospace",whiteSpace:"nowrap" }}>{entry.id}</td>
                  <td style={{ padding:"7px 10px",fontSize:12,fontWeight:700,color:"#0F172A" }}>{entry.reservationId}</td>
                  <td style={{ padding:"7px 10px",fontSize:12,color:"#334155",whiteSpace:"nowrap",maxWidth:120,
                    overflow:"hidden",textOverflow:"ellipsis" }}>{entry.invoiceId}</td>
                  <td style={{ padding:"7px 10px",fontSize:11,color:"#64748B",whiteSpace:"nowrap" }}>{entry.description}</td>
                  <td style={{ padding:"7px 10px",fontSize:12,fontWeight:700,color:"#0F172A",
                    fontFamily:"'JetBrains Mono',monospace" }}>{fmtMoney(entry.amount)}</td>
                  <td style={{ padding:"7px 10px" }}>
                    <span style={{ fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:5,
                      background:mc.bg,color:mc.text,whiteSpace:"nowrap" }}>{mc.label}</span>
                  </td>
                  <td style={{ padding:"7px 10px",fontSize:11,color:"#94A3B8",whiteSpace:"nowrap" }}>{entry.time}</td>
                  <td style={{ padding:"7px 10px" }}>
                    <div style={{ display:"flex",alignItems:"center",gap:4 }}>
                      <span style={{ width:6,height:6,borderRadius:99,background:sc.dot,flexShrink:0 }} />
                      <span style={{ fontSize:11,fontWeight:600,color:sc.text }}>{sc.label}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="acct-pagination" style={{ display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"10px 18px",borderTop:"1px solid #E2E8F0",background:"#F8FAFC",flexShrink:0 }}>
        <span style={{ fontSize:11,color:"#64748B" }}>{loading ? "Đang tải trang giao dịch…" : error ? "Chưa tải được giao dịch" : `Hiển thị ${totalElements === 0 ? 0 : (page-1)*PER_PAGE+1}–${totalElements === 0 ? 0 : (page-1)*PER_PAGE+pageRows.length} trên ${totalElements} giao dịch`}</span>
        <div style={{ display:"flex",gap:4,alignItems:"center" }}>
          <button type="button" aria-label="Trang trước" onClick={() => setPage(p=>Math.max(1,p-1))} disabled={loading || !!error || page===1}
            style={{ width:24,height:24,borderRadius:6,border:"1px solid #E2E8F0",background:"#FFF",
              cursor:loading || error || page===1?"not-allowed":"pointer",color:loading || error || page===1?"#CBD5E1":"#475569",
              display:"flex",alignItems:"center",justifyContent:"center" }}>
            <ChevronLeft size={11} />
          </button>
          {pageNumbers.map(n => (
            <button type="button" aria-label={`Trang ${n}`} aria-current={page===n?"page":undefined} disabled={loading || !!error} key={n} onClick={() => setPage(n)}
              style={{ width:24,height:24,borderRadius:6,fontSize:11,
                border:page===n?"none":"1px solid #E2E8F0",cursor:"pointer",
                background:page===n?"#0F172A":"#FFF",color:page===n?"#FFF":"#475569",
                fontWeight:page===n?700:400 }}>{n}</button>
          ))}
          <button type="button" aria-label="Trang sau" onClick={() => setPage(p=>Math.min(totalPages,p+1))} disabled={loading || !!error || page>=totalPages}
            style={{ width:24,height:24,borderRadius:6,border:"1px solid #E2E8F0",background:"#FFF",
              cursor:loading || error || page>=totalPages?"not-allowed":"pointer",color:loading || error || page>=totalPages?"#CBD5E1":"#475569",
              display:"flex",alignItems:"center",justifyContent:"center" }}>
            <ChevronRight size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   OTA RECONCILIATION SCREEN
══════════════════════════════════════════════════════════ */
export default function AccountingStation({ onBack }: { onBack: () => void }) {
  const [mainTab, setMainTab] = useState<AccountingPage>("ledger");
  const [selectedDate,setSelectedDate]=useState(businessDateValue());
  const [refresh,setRefresh]=useState(0);
  const [globalSearch,setGlobalSearch]=useState("");
  const [dataError,setDataError]=useState("");
  const [dataLoading,setDataLoading]=useState(true);
  const refreshData=()=>setRefresh(value=>value+1);
  const [userProfile, setUserProfile] = useState<EmployeeProfileDto | null>(null);

  useEffect(() => {
    let active = true;
    setDataLoading(true);
    setDataError("");
    authApi.employeeProfile()
      .then(value => { if (active) setUserProfile(value); })
      .catch(cause => { if (active) setDataError(apiErrorMessage(cause,"Không thể tải hồ sơ kế toán.")); })
      .finally(() => { if (active) setDataLoading(false); });
    return()=>{active=false;};
  },[refresh]);

  return (
    <AccountingWorkspace
      page={mainTab} onPageChange={next=>{setGlobalSearch("");setMainTab(next);}} profile={userProfile} loading={dataLoading}
      search={globalSearch} onSearchChange={setGlobalSearch}
      date={selectedDate} onDateChange={setSelectedDate} onRefresh={refreshData} onLogout={onBack}
      metrics={[]}
      alerts={<>
        {dataError && <p role="alert">{dataError} <button type="button" style={compactActionStyle} onClick={refreshData}>Tải lại dữ liệu</button></p>}
        {dataLoading && <p role="status">Đang cập nhật dữ liệu kế toán…</p>}
      </>}
    >
      {mainTab === "dashboard" && <RevenueDashboard refresh={refresh}/>}
      {mainTab === "invoices" && <InvoiceOperations refresh={refresh} search={globalSearch} onChanged={refreshData}/>}
      {mainTab === "receipts" && <ReceiptOperations refresh={refresh} search={globalSearch} onChanged={refreshData}/>}
      {mainTab === "ledger" && <LedgerPanel fillHeight date={selectedDate} onDateChange={setSelectedDate} search={globalSearch} onSearchChange={setGlobalSearch} refresh={refresh}/>}
    </AccountingWorkspace>
  );
}
