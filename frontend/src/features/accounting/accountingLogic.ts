import type { Invoice } from "../../shared/types/hotelOperations";
import { ApiError, apiErrorMessage } from "../../shared/api/client";

/** Preserve local accounting validation messages while keeping API errors structured. */
export const accountingErrorMessage = (error: unknown, fallback: string) => error instanceof ApiError
  ? apiErrorMessage(error, fallback)
  : error instanceof Error && error.message ? error.message : fallback;

export const businessDateValue = (date = new Date()) => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
}).format(date);

/** Invoice.payable is remaining receivable, never revenue or the VAT base. */
export const invoiceTotal = (invoice: Invoice) => Math.max(0, invoice.room_total + invoice.service_total
  + invoice.late_surcharge + invoice.compensation + invoice.extension_total + invoice.adjustment_total - invoice.discount);

export const invoiceStatusLabel = (invoice: Invoice) => invoice.status === "DU_KIEN" ? "Dự kiến"
  : invoice.status === "DA_THANH_TOAN" ? "Đã thanh toán" : "Còn công nợ";
