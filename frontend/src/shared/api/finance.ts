import { ApiError, apiClient } from "./client";
import type { Invoice, LedgerPayment, Page, Payment, PaymentPage, PaymentCreateRequest, PaymentQuery, Receipt, ReceiptQuery, RevenueSummary, UnissuedTransaction } from "../types/hotelOperations";

const key = () => `FIN-${(globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^a-zA-Z0-9]/g, "").slice(0, 31)}`;
const query = (params: object) => { const value = Object.entries(params).filter(([, item]) => item !== undefined && item !== "").map(([name, item]) => [name, String(item)] as [string, string]); const text = new URLSearchParams(value).toString(); return text ? `?${text}` : ""; };
const requiredKey = (value: string) => { const normalized = value?.trim(); if (!normalized || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,34}$/.test(normalized)) throw new Error("Mutation requires a valid Idempotency-Key"); return normalized; };
const mutation = <T>(path: string, body: unknown, idempotencyKey: string) => apiClient.request<T>(path, { method: "POST", body, idempotencyKey: requiredKey(idempotencyKey) });
interface ApiPage<T> { items: T[]; page: number; size: number; total_elements: number; total_pages: number; }
const normalizePage = <T>(res: ApiPage<T>): Page<T> => {
  if (!res || !Array.isArray(res.items) || !Number.isSafeInteger(res.page) || res.page < 0 || !Number.isSafeInteger(res.size) || res.size <= 0 || !Number.isSafeInteger(res.total_elements) || res.total_elements < 0 || res.total_pages !== Math.ceil(res.total_elements / res.size) || res.items.length !== Math.max(0, Math.min(res.size, res.total_elements - res.page * res.size))) throw new ApiError(502, { code: "INVALID_PAGE_RESPONSE", message: "Phản hồi phân trang không hợp lệ. Vui lòng tải lại." });
  return { items: res.items, page: res.page, size: res.size, totalElements: res.total_elements, totalPages: res.total_pages };
};

export const financeApi = {
  invoices: (params: { status?: string; reservation_id?: number; from?: string; to?: string; page?: number; size?: number } = {}) => apiClient.request<ApiPage<Invoice>>(`/api/invoices${query(params)}`).then(normalizePage<Invoice>),
  payments: (params: PaymentQuery = {}): Promise<PaymentPage> => apiClient.request<ApiPage<LedgerPayment> & { method_counts: PaymentPage["methodCounts"] }>(`/api/finance/payments${query(params)}`).then(res => { const page = normalizePage(res); if (!res.method_counts || typeof res.method_counts !== "object" || Array.isArray(res.method_counts) || Object.values(res.method_counts).some(count => !Number.isSafeInteger(count) || (count ?? -1) < 0)) throw new ApiError(502, { code: "INVALID_PAGE_RESPONSE", message: "Phản hồi thống kê phương thức thanh toán không hợp lệ." }); return { ...page, methodCounts: res.method_counts }; }),
  invoicePayments: (invoiceId: number) => apiClient.request<Payment[] | Page<Payment>>(`/api/invoices/${invoiceId}/payments`),
  receipts: (params: ReceiptQuery = {}) => apiClient.request<Page<Receipt>>(`/api/finance/receipts${query(params)}`),
  invoiceReceipts: (invoiceId: number) => apiClient.request<Receipt[] | Page<Receipt>>(`/api/invoices/${invoiceId}/receipts`),
  recordPayment: (invoiceId: number, body: PaymentCreateRequest, idempotencyKey: string) => mutation<Payment>(`/api/invoices/${invoiceId}/payments`, body, idempotencyKey),
  issueReceipt: (invoiceId: number, body: { receipt_number: string; amount: number; method: Receipt["method"] }, idempotencyKey: string) => mutation<Receipt>(`/api/invoices/${invoiceId}/receipts`, body, idempotencyKey),
  revenueSummary: () => apiClient.request<RevenueSummary>("/api/finance/revenue-summary"),
  unissuedReceipts: () => apiClient.request<UnissuedTransaction[]>("/api/finance/unissued-receipts"),
};
export const newFinanceIdempotencyKey = key;
