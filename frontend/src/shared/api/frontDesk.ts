import { apiClient } from "./client";
import type { CheckInRequest, CheckOutRequest, Dashboard, Guest, GuestCreate, Invoice, Page, Payment, Receipt, Reservation, ReservationCreate, RoomPriceQuote, RoomSummary, ServiceCatalogItem, TimelineEvent } from "../types/frontDesk";

const key = (): string => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const mutate = <T>(path: string, body?: unknown, method: "POST" | "PATCH" = "POST", idempotencyKey = key()) => apiClient.request<T>(path, { method, body, idempotencyKey });
const query = (params: Record<string, unknown>) => {
  const values = Object.entries(params).filter(([, value]) => value !== undefined && value !== "");
  return values.length === 0 ? "" : `?${new URLSearchParams(values.map(([name, value]) => [name, String(value)]))}`;
};
export const frontDeskApi = {
  dashboard: (params: { date?: string; q?: string; status?: string; page?: number; size?: number } = {}) => apiClient.request<Dashboard>(`/api/front-desk/dashboard${query(params)}`),
  guests: (q?: string) => apiClient.request<Guest[]>(`/api/guests${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  guest: (id: number) => apiClient.request<Guest>(`/api/guests/${id}`),
  createGuest: (body: GuestCreate) => apiClient.request<Guest>("/api/guests", { method: "POST", body }),
  reservations: (params: { status?: string; guest_id?: number; page?: number; size?: number } = {}) => apiClient.request<Page<Reservation>>(`/api/reservations${query(params)}`),
  reservation: (id: number) => apiClient.request<Reservation>(`/api/reservations/${id}`),
  createReservation: (body: ReservationCreate) => apiClient.request<Reservation>("/api/reservations", { method: "POST", body, idempotencyKey: body.idempotency_key ?? key() }),
  cancel: (id: number, reason: string, idempotencyKey?: string) => mutate<Reservation>(`/api/reservations/${id}/cancel`, { reason }, "POST", idempotencyKey),
  checkIn: (id: number, body: CheckInRequest = {}, idempotencyKey?: string) => mutate<Reservation>(`/api/reservations/${id}/check-in`, body, "POST", idempotencyKey),
  checkOut: (id: number, body: CheckOutRequest, idempotencyKey?: string) => mutate<Invoice>(`/api/reservations/${id}/check-out`, body, "POST", idempotencyKey),
  addService: (id: number, body: { service_id: string; quantity: number; used_at?: string; room_id?: string; meal_period?: "LUNCH" | "DINNER" }, idempotencyKey?: string) => mutate<Reservation>(`/api/reservations/${id}/services`, body, "POST", idempotencyKey),
  services: () => apiClient.request<ServiceCatalogItem[]>("/api/services"),
  updateRoomStatus: (roomId: string, status: string) => apiClient.request<RoomSummary>(`/api/rooms/${encodeURIComponent(roomId)}/status?status=${encodeURIComponent(status)}`, { method: "PATCH" }),
  roomPriceQuote: (roomId: string, from: string, to: string) => apiClient.request<RoomPriceQuote>(`/api/rooms/${encodeURIComponent(roomId)}/price-quote${query({ from, to })}`),
  invoices: (params: { reservation_id?: number; page?: number; size?: number } = {}) => apiClient.request<Page<Invoice>>(`/api/invoices?${new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined).map(([name, value]) => [name, String(value)])).toString()}`),
  invoice: (reservationId: number) => apiClient.request<Invoice>(`/api/invoices/reservation/${reservationId}`),
  payments: (invoiceId: number) => apiClient.request<Payment[] | Page<Payment>>(`/api/invoices/${invoiceId}/payments`),
  receipts: (invoiceId: number) => apiClient.request<Receipt[] | Page<Receipt>>(`/api/invoices/${invoiceId}/receipts`),
  timeline: (id: number) => apiClient.request<TimelineEvent[]>(`/api/reservations/${id}/timeline`),
};

export const newFrontDeskIdempotencyKey = () => `FD-${key().replace(/[^a-zA-Z0-9]/g, "").slice(0, 32)}`;
