import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "./client";
import { frontDeskApi, newFrontDeskIdempotencyKey } from "./frontDesk";

describe("front desk API contract", () => {
  const request = vi.spyOn(apiClient, "request");
  beforeEach(() => { request.mockReset(); request.mockResolvedValue({}); });

  it("uses exact dashboard, guest and reservation read paths", async () => {
    await frontDeskApi.dashboard({ date: "2026-09-18", status: "CONFIRMED", page: 1, size: 20 });
    await frontDeskApi.guests("An");
    await frontDeskApi.guest(7);
    await frontDeskApi.reservations({ guest_id: 7, page: 1 });
    await frontDeskApi.reservation(9);
    expect(request.mock.calls.map(call => call[0])).toEqual([
      "/api/front-desk/dashboard?date=2026-09-18&status=CONFIRMED&page=1&size=20", "/api/guests?q=An", "/api/guests/7", "/api/reservations?guest_id=7&page=1", "/api/reservations/9",
    ]);
  });

  it("does not add an empty query string to unfiltered reads", async () => {
    await frontDeskApi.dashboard();
    await frontDeskApi.reservations();
    expect(request.mock.calls.map(call => call[0])).toEqual(["/api/front-desk/dashboard", "/api/reservations"]);
  });

  it("generates a fresh header key for each retry-safe reservation mutation", async () => {
    await frontDeskApi.createReservation({ guest_id: 1, employee_id: "E1", rental_type: "PACKAGE", rooms: [] });
    await frontDeskApi.checkIn(1);
    const options = request.mock.calls.map(call => call[1] as { idempotencyKey?: string; method?: string; body?: unknown });
    expect(options.every(option => option.idempotencyKey)).toBe(true);
    expect(new Set(options.map(option => option.idempotencyKey)).size).toBe(2);
  });

  it("keeps front desk mutation keys within the backend limit", () => {
    expect(newFrontDeskIdempotencyKey()).toMatch(/^FD-[a-zA-Z0-9]{32}$/);
    expect(newFrontDeskIdempotencyKey()).toHaveLength(35);
  });

  it("covers supported lifecycle, service, billing, receipt and timeline endpoint paths", async () => {
    await frontDeskApi.cancel(2, "guest request"); await frontDeskApi.checkIn(2); await frontDeskApi.checkOut(2, { at: "2026-09-20T11:30:00" }); await frontDeskApi.addService(2, { service_id: "BREAKFAST", quantity: 1 }); await frontDeskApi.services(); await frontDeskApi.invoice(2); await frontDeskApi.payments(8); await frontDeskApi.receipts(8); await frontDeskApi.timeline(2);
    expect(request.mock.calls.map(call => call[0])).toEqual(expect.arrayContaining(["/api/reservations/2/cancel", "/api/reservations/2/check-in", "/api/reservations/2/check-out", "/api/reservations/2/services", "/api/services", "/api/invoices/reservation/2", "/api/invoices/8/payments", "/api/invoices/8/receipts", "/api/reservations/2/timeline"]));
  });

  it("reuses a caller-provided key for retryable front desk mutations", async () => {
    await frontDeskApi.addService(2, { service_id: "MINIBAR", quantity: 2 }, "FD-service-1");
    await frontDeskApi.checkIn(2, {}, "FD-checkin-1");
    expect(request.mock.calls.map(call => call[1])).toEqual([
      expect.objectContaining({ idempotencyKey: "FD-service-1" }),
      expect.objectContaining({ idempotencyKey: "FD-checkin-1" }),
    ]);
  });
});
