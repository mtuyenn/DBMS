import { useEffect, useState } from "react";
import { financeApi } from "../../shared/api/finance";
import { apiErrorMessage } from "../../shared/api/client";
import type { RevenueSummary } from "../../shared/types/hotelOperations";
import { formatVnd } from "../../shared/utils/money";
import { formatDateVi } from "../../shared/utils/localDate";
import { compactActionStyle } from "./accountingUi";
import { TrendingUp, Calendar, CreditCard, Banknote, DollarSign, PieChart, RefreshCw } from "lucide-react";

export default function RevenueDashboard({ refresh }: { refresh: number }) {
  const [data, setData] = useState<RevenueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [localRefresh, setLocalRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    financeApi.revenueSummary()
      .then(res => { if (active) setData(res); })
      .catch(cause => { if (active) setError(apiErrorMessage(cause, "Không thể tải báo cáo doanh thu.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refresh, localRefresh]);

  const total = data?.total_revenue ?? 0;
  const today = data?.today_revenue ?? 0;
  const maxDaily = Math.max(1, ...(data?.daily?.map(d => d.revenue) ?? [1]));

  return (
    <div className="flex flex-col gap-6" style={{ padding: 4 }}>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "18px 20px" }}>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span style={{ fontSize: 13, fontWeight: 500 }}>TỔNG DOANH THU</span>
            <div style={{ padding: 8, background: "#EFF6FF", borderRadius: 8, color: "#2563EB" }}><DollarSign size={18} /></div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#0F172A" }}>{formatVnd(total)}</div>
          <p style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>Dựa trên tất cả giao dịch hoàn tất</p>
        </div>

        <div style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "18px 20px" }}>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span style={{ fontSize: 13, fontWeight: 500 }}>DOANH THU HÔM NAY</span>
            <div style={{ padding: 8, background: "#ECFDF5", borderRadius: 8, color: "#059669" }}><TrendingUp size={18} /></div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#0F172A" }}>{formatVnd(today)}</div>
          <p style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>Số tiền thu trong ngày hiện tại</p>
        </div>

        {data?.by_method?.map((m, idx) => (
          <div key={idx} style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "18px 20px" }}>
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span style={{ fontSize: 13, fontWeight: 500 }}>{m.method.toUpperCase()}</span>
              <div style={{ padding: 8, background: idx % 2 === 0 ? "#FEF3C7" : "#F3E8FF", borderRadius: 8, color: idx % 2 === 0 ? "#D97706" : "#7C3AED" }}>
                {m.method.includes("Thẻ") || m.method.includes("Chuyển") ? <CreditCard size={18} /> : <Banknote size={18} />}
              </div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#0F172A" }}>{formatVnd(m.revenue)}</div>
            <p style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>
              {total > 0 ? `${Math.round((m.revenue / total) * 100)}% tổng doanh thu` : "Chưa có tỷ trọng"}
            </p>
          </div>
        ))}
      </div>

      {error && (
        <div role="alert" style={{ background: "#FEF2F2", border: "1px solid #F87171", color: "#991B1B", padding: 14, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>{error}</span>
          <button style={compactActionStyle} onClick={() => setLocalRefresh(r => r + 1)}>Thử lại</button>
        </div>
      )}

      {loading && <p role="status" className="text-slate-500 p-4">Đang tải số liệu doanh thu từ SQL Server…</p>}

      {!loading && data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Daily Revenue Table & Bars */}
          <div className="lg:col-span-2" style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 22 }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar size={18} style={{ color: "#2563EB" }} />
                <h3 style={{ fontSize: 16, fontWeight: 600 }}>Doanh thu theo ngày</h3>
              </div>
              <button style={compactActionStyle} onClick={() => setLocalRefresh(r => r + 1)}>
                <RefreshCw size={14} /> Làm mới
              </button>
            </div>

            {data.daily?.length === 0 ? (
              <p className="text-slate-500 py-6 text-center">Chưa có dữ liệu doanh thu theo ngày.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {data.daily?.map((d, index) => {
                  const pct = Math.round((d.revenue / maxDaily) * 100);
                  return (
                    <div key={index} className="flex flex-col gap-1 p-3 rounded-lg border border-slate-100 bg-slate-50">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-800">{formatDateVi(d.date)} ({d.date})</span>
                        <strong className="text-blue-600">{formatVnd(d.revenue)}</strong>
                      </div>
                      <div style={{ height: 8, background: "#E2E8F0", borderRadius: 4, overflow: "hidden", marginTop: 4 }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #3B82F6, #1D4ED8)", borderRadius: 4, transition: "width 0.4s ease" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Payment Method Breakdown */}
          <div style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 22 }}>
            <div className="flex items-center gap-2 mb-4">
              <PieChart size={18} style={{ color: "#7C3AED" }} />
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Cơ cấu thanh toán</h3>
            </div>

            <div className="flex flex-col gap-4">
              {data.by_method?.map((m, idx) => {
                const pct = total > 0 ? Math.round((m.revenue / total) * 100) : 0;
                return (
                  <div key={idx} className="p-3 rounded-lg border border-slate-100 bg-slate-50">
                    <div className="flex justify-between items-center text-sm mb-1">
                      <span className="font-medium text-slate-700">{m.method}</span>
                      <span className="font-bold text-slate-900">{formatVnd(m.revenue)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                      <span>Tỷ trọng</span>
                      <span>{pct}%</span>
                    </div>
                    <div style={{ height: 6, background: "#E2E8F0", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: idx === 0 ? "#10B981" : idx === 1 ? "#3B82F6" : "#8B5CF6", borderRadius: 3 }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 p-4 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-800 leading-relaxed">
              Dữ liệu doanh thu và cơ cấu thanh toán được tự động tổng hợp trực tiếp từ các giao dịch thanh toán hoàn tất trong hệ thống.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
