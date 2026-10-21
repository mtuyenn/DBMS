export type HKStatus  = "to-clean" | "in-progress" | "inspecting" | "ready";
export type SubType   = "checkout-dirty" | "stayover" | "vip-arrival" | "maintenance";
export type NavPage = "overview" | "board" | "services";
export type ShiftName = "Sáng" | "Chiều" | "Tối";
export type Priority  = "high" | "medium" | "low";
export type IncStatus = "open" | "in-progress" | "resolved";

export interface Staff {
  id: string; name: string; shortName: string;
  shift: ShiftName; color: string; rooms: number; done: number;
}
export interface CheckItem { id: string; label: string; done: boolean; }
export interface MinibarItem { item: string; unit: string; count: number; }
export interface HKRoom {
  id: string; number: string; floor: number; type: string;
  status: HKStatus; subType: SubType; isVip?: boolean;
  staffId?: string; estMin?: number; doneMin?: number;
  taskId?: number;
  checklist: CheckItem[]; minibar: MinibarItem[];
  notes?: string;
}
export interface Incident {
  id: string; room: string; type: string; desc: string;
  priority: Priority; status: IncStatus;
  reportedBy: string; reportedAt: string; assignedTo?: string;
}

export type LinenRow = { id:string; item:string; unit:string; stock:number; min:number; category:string };
