import { useEffect, useState } from "react";
import { financeApi as api, newFinanceIdempotencyKey } from "../../shared/api/finance";
import { apiErrorMessage } from "../../shared/api/client";
import type { Page, Receipt, UnissuedTransaction } from "../../shared/types/hotelOperations";
import { formatVnd } from "../../shared/utils/money";
import { compactActionStyle } from "./accountingUi";
import { AccountingDocument, receiptDocument } from "./AccountingDocument";
import { Receipt as ReceiptIcon, AlertCircle, CheckCircle2, Printer, PlusCircle, RefreshCw } from "lucide-react";

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

export default function ReceiptOperations({ refresh, search, onChanged }: { refresh: number; search: string; onChanged: () => void }) {
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Page<Receipt> | null>(null);
  const [unissued, setUnissued] = useState<UnissuedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [unissuedLoading, setUnissuedLoading] = useState(false);
  const [error, setError] = useState("");
  const [document, setDocument] = useState<Receipt | null>(null);
  const [issuingId, setIssuingId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const invId = search.trim() ? Number(search.trim()) : undefined;
    api.receipts({ page, size: 10, invoice_id: Number.isSafeInteger(invId) ? invId : undefined })
      .then(r => { if (active) setData(r); })
      .catch(e => { if (active) setError(apiErrorMessage(e, "Không thể tải danh sách biên lai.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, refresh, search]);

  useEffect(() => {
    let active = true;
    setUnissuedLoading(true);
    api.unissuedReceipts()
      .then(res => { if (active) setUnissued(res); })
      .catch(() => {})
      .finally(() => { if (active) setUnissuedLoading(false); });
    return () => { active = false; };
  }, [refresh]);

  async function handleIssue(item: UnissuedTransaction) {
    if (issuingId) return;
    setIssuingId(item.transaction_id);
    setError("");
    try {
      const receiptNumber = `BL-${item.transaction_id}-${Date.now().toString().slice(-4)}`;
      await api.issueReceipt(item.invoice_id, {
        receipt_number: receiptNumber,
        amount: item.amount,
        method: item.method
      }, newFinanceIdempotencyKey());
      onChanged();
    } catch (cause) {
      setError(apiErrorMessage(cause, "Không thể phát hành biên lai cho giao dịch này."));
    } finally {
      setIssuingId(null);
    }
  }

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
          <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 12, background: unissued.length > 0 ? "#FEF3C7" : "#ECFDF5", color: unissued.length > 0 ? "#92400E" : "#065F46", fontWeight: 600 }}>
            {unissued.length} giao dịch chờ
          </span>
        </div>

        {unissuedLoading && <p className="text-slate-500 text-sm">Đang kiểm tra giao dịch…</p>}

        {!unissuedLoading && unissued.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 p-3 rounded-lg border border-emerald-100">
            <CheckCircle2 size={16} />
            <span>Toàn bộ các giao dịch thanh toán hoàn tất đều đã được phát hành biên lai hợp lệ.</span>
          </div>
        )}

        {!unissuedLoading && unissued.length > 0 && (
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="p-2">Mã GD</th>
                  <th className="p-2">Hóa đơn</th>
                  <th className="p-2">Số tiền</th>
                  <th className="p-2">Phương thức</th>
                  <th className="p-2">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {unissued.map(u => (
                  <tr key={u.transaction_id} className="border-b border-slate-100">
                    <td className="p-2 font-mono text-slate-800">GD-{u.transaction_id}</td>
                    <td className="p-2">INV-{u.invoice_id}</td>
                    <td className="p-2 font-semibold text-emerald-600">{formatVnd(u.amount)}</td>
                    <td className="p-2">{methodBadge(u.method)}</td>
                    <td className="p-2">
                      <button
                        style={compactActionStyle}
                        disabled={issuingId === u.transaction_id}
                        onClick={() => handleIssue(u)}
                      >
                        <PlusCircle size={14} /> {issuingId === u.transaction_id ? "Đang phát hành…" : "Xuất biên lai"}
                      </button>
                    </td>
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
              {!loading && data?.items.map(r => (
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

        {!loading && data?.items.length === 0 && (
          <p className="p-6 text-center text-slate-500">Chưa có biên lai nào được phát hành.</p>
        )}

        <div className="my-4 flex items-center gap-3">
          <button style={compactActionStyle} disabled={page === 0 || loading} onClick={() => setPage(p => p - 1)}>
            Trước
          </button>
          <span>Trang {page + 1}/{Math.max(1, data?.totalPages ?? 1)}</span>
          <button style={compactActionStyle} disabled={loading || page + 1 >= (data?.totalPages ?? 1)} onClick={() => setPage(p => p + 1)}>
            Sau
          </button>
        </div>
      </div>

      {document && <AccountingDocument data={receiptDocument(document)} onClose={() => setDocument(null)} />}
    </div>
  );
}
