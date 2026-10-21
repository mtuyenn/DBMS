import type { ReservationStatus } from "../../shared/types/frontDesk";

export type OccStatus   = "vacant" | "reserved" | "occupied" | "dnd" | "ood";
export type CleanStatus = "clean" | "cleaning" | "dirty";
export type VipTier     = "silver" | "gold" | "platinum";

export interface FolioItem { label: string; amount: number; }
export interface Room {
  id: string; number: string; floor: number;
  operationalStatus: string;
  type: string; beds: string; dailyPrice?: number;
  occStatus: OccStatus; cleanStatus: CleanStatus;
  guestName?: string; guestPhone?: string; checkIn?: string; checkOut?: string;
  nationalId?: string; bookingId?: string;
  folioItems?: FolioItem[];
  folioTotal?: number;
  folioCurrency?: "$" | "VND";
  vipTier?: VipTier; notes?: string[];
  reservationId?: number; guestId?: number; reservationStatus?: ReservationStatus;
}
