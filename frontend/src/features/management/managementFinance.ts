import { useEffect, useState } from "react";
import { financeApi } from "../../shared/api/finance";
import { apiErrorMessage } from "../../shared/api/client";
import type { LedgerPayment, Reconciliation } from "../../shared/types/hotelOperations";
import { businessDateValue } from "../accounting/accountingLogic";

export function revenueDates(today = businessDateValue()) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today + "T12:00:00+07:00");
    date.setDate(date.getDate() - 6 + index);
    return businessDateValue(date);
  });
}

function summarizePayments(rows: LedgerPayment[], from: string, to: string): Reconciliation {
  const entries = rows.filter(row => row.status === "COMPLETED" && row.occurred_at.slice(0, 10) >= from && row.occurred_at.slice(0, 10) <= to);
  const payments = entries.filter(row => row.type === "PAYMENT");
  const refunds = entries.filter(row => row.type === "REFUND");
  const totalPayments = payments.reduce((sum, row) => sum + row.amount, 0);
  const totalRefunds = refunds.reduce((sum, row) => sum + row.amount, 0);
  const totalsByMethod: Record<string, number> = {};
  for (const row of entries) totalsByMethod[row.method] = (totalsByMethod[row.method] ?? 0) + (row.type === "REFUND" ? -row.amount : row.amount);
  return {
    from_date: from,
    to_date: to,
    totals_by_method: totalsByMethod,
    total_payments: totalPayments,
    total_refunds: totalRefunds,
    net_total: totalPayments - totalRefunds,
    recognized_revenue: totalPayments - totalRefunds,
    outstanding_partner_debt: 0,
    cash_variance: 0,
    completed_transactions: entries.length,
    outstanding_bank_transfer_balances: 0,
  };
}

export function useManagementFinance() {
  const [daily, setDaily] = useState<Reconciliation | null>(null);
  const [monthly, setMonthly] = useState<Reconciliation | null>(null);
  const [ledger, setLedger] = useState<LedgerPayment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const today = businessDateValue();
  const dates = revenueDates(today);
  const monthStart = today.slice(0, 7) + "-01";

  useEffect(() => {
    let active = true;
    async function loadPayments() {
      const entries: LedgerPayment[] = [];
      for (let page = 0; ; page++) {
        const result = await financeApi.payments({ from: monthStart, to: today, page, size: 100 });
        entries.push(...result.items);
        if (page + 1 >= result.totalPages) return entries;
      }
    }
    loadPayments().then(entries => {
      if (!active) return;
      setLedger(entries);
      setDaily(summarizePayments(entries, today, today));
      setMonthly(summarizePayments(entries, monthStart, today));
      setError(null);
    }).catch(cause => {
      if (active) {
        setLedger([]);
        setDaily(null);
        setMonthly(null);
        setError(apiErrorMessage(cause, "Không thể tải số liệu thanh toán."));
      }
    });
    return () => { active = false; };
  }, [monthStart, today, version]);

  const days = dates.map(date => ({
    date,
    day: date.slice(8, 10) + "/" + date.slice(5, 7),
    today: date === today,
    rev: ledger.filter(row => row.status === "COMPLETED" && row.occurred_at.slice(0, 10) === date)
      .reduce((sum, row) => sum + (row.type === "REFUND" ? -row.amount : row.amount), 0),
  }));
  return { daily, monthly, days, today, error, reload: () => setVersion(value => value + 1) };
}

export type ManagementFinance = ReturnType<typeof useManagementFinance>;
