export type ReservationStatus = "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED";
export type RentalType = "PACKAGE";
export type PaymentMethod = "CASH" | "CARD" | "BANK_TRANSFER";
export type PaymentStatus = "DA_THANH_TOAN" | "CHUA_THANH_TOAN" | "DU_KIEN";
export type TransactionType = "PAYMENT" | "REFUND";
export type RoomCanonicalStatus = "available" | "reserved" | "occupied" | "cleaning" | "maintenance" | "out_of_service" | "returned" | "cancelled";

export interface Guest { id: number; full_name: string; identity_number: string; phone: string; email: string | null; total_spend: number; }
export interface GuestCreate { full_name: string; identity_number: string; phone: string; email?: string; }
export interface RoomLine { room_id: string; expected_check_in: string; expected_check_out: string; actual_check_in: string | null; actual_check_out: string | null; }
export interface Reservation { id: number; guest_id: number; employee_id: string | null; status: ReservationStatus; rental_type: RentalType; booked_at: string; actual_check_in: string | null; actual_check_out: string | null; rooms: RoomLine[]; cancellation_reason: string | null; service_usages?: { service_id: string; service_name: string; used_on: string; quantity: number; unit_price: number; amount: number }[]; }
export interface Page<T> { items: T[]; page: number; size: number; total_elements: number; total_pages: number; }
export interface DashboardItem { reservation_id: number; guest_id: number; guest_name: string; guest_phone: string; status: ReservationStatus; check_in: string; check_out: string; room_ids: string[]; invoice_balance: number; }
export interface RoomSummary { room_id: string; name: string; status: string; room_type_id: string; room_type_name: string; floor: number; daily_price: number; bed_type: string | null; }
export interface RoomPriceQuote { room_id: string; room_type_name: string; daily_price: number; nights: number; estimated_total: number; }
export interface Dashboard { business_date: string; arrivals: DashboardItem[]; departures: DashboardItem[]; current_stays: DashboardItem[]; upcoming_stays?: DashboardItem[]; invoice_balances: DashboardItem[]; rooms: RoomSummary[]; room_counts: Record<string, number>; incidents: { id: number; reservation_id: number; room_id: string; compensation: number }[]; page: number; size: number; total_elements: number; total_pages: number; }
export interface Invoice { id: number; reservation_id: number; issued_at: string; room_total: number; service_total: number; late_surcharge: number; compensation: number; extension_total: number; adjustment_total: number; discount: number; payable: number; payment_method: PaymentMethod | null; status: PaymentStatus; }
export interface Payment { id: number; invoice_id: number; amount: number; method: PaymentMethod; type: TransactionType; status: "COMPLETED" | "FAILED" | "VOIDED"; reference: string | null; occurred_at: string; actor_id: string; }
export interface Receipt { id: number; receipt_number: string; invoice_id: number; amount: number; method: PaymentMethod; issued_at: string; issued_by: string; }
export interface TimelineEvent { id: number; event_type?: string; action?: string; actor_id?: string; occurred_at?: string; created_at?: string; details?: string; }

export interface ReservationCreate { guest_id: number; employee_id: string; rental_type: RentalType; rooms: { room_id: string; expected_check_in: string; expected_check_out: string; guest_count?: number }[]; idempotency_key?: string; }
export interface CheckInRequest { at?: string; }
export interface CheckOutRequest { at?: string; payment_method?: PaymentMethod; }
export interface ServiceCatalogItem { id: string; name: string; price: number; unit: string | null; stock: number; active?: boolean; }
