import { apiClient } from "./client";

export interface ManagementOverview {
  so_le_tan: number;
  so_quan_ly: number;
  so_buong_phong: number;
  so_ke_toan: number;
  so_phong_san_sang: number;
  so_phong_co_khach: number;
  so_phong_can_don: number;
  so_phong_dang_don: number;
  so_loai_phong_dang_hoat_dong: number;
}

export interface RoomTypePerformance {
  ma_loai_phong: string;
  ten_loai_phong: string;
  gia_theo_ngay: number;
  tong_so_phong: number;
  so_phong_co_khach: number;
  so_phong_san_sang: number;
  so_phong_can_don: number;
  so_phong_bao_tri: number;
  cong_suat_hien_tai: number;
}

export const managementApi = {
  overview: () => apiClient.request<ManagementOverview>("/api/management/reports/overview"),
  roomTypePerformance: () => apiClient.request<RoomTypePerformance[]>("/api/management/reports/room-types"),
};
