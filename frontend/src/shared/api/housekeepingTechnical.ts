import { apiClient } from "./client";
import type { Room, RoomAvailability, RoomStatus } from "../types/housekeepingTechnical";

export interface MutationOptions { idempotencyKey?: string; }

const idempotencyKey = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const key = (options?: MutationOptions) => options?.idempotencyKey ?? idempotencyKey();
const query = (params: Record<string, string | undefined>) => {
  const value = new URLSearchParams();
  Object.entries(params).forEach(([name, item]) => { if (item !== undefined && item !== "") value.set(name, item); });
  const result = value.toString();
  return result ? `?${result}` : "";
};

export const housekeepingTechnicalApi = {
  rooms: (params: { type?: string; status?: RoomStatus } = {}) => apiClient.request<Room[]>(`/api/rooms${query(params)}`),
  availability: (from: string, to: string, type?: string) => apiClient.request<RoomAvailability[]>(`/api/rooms/availability${query({ from, to, type })}`),
  updateRoomStatus: (roomId: string, status: RoomStatus, options?: MutationOptions) => apiClient.request<Room>(`/api/rooms/${encodeURIComponent(roomId)}/status${query({ status })}`, { method: "PATCH", idempotencyKey: key(options) }),
};

/** UI callers create this once per user action and pass it through retries unchanged. */
export const housekeepingTechnicalMutationKey = idempotencyKey;
