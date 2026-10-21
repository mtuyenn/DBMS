import type { Room } from "../../shared/types/domain";
import standardPhoto from "./assets/room-standard.jpg";
import deluxePhoto from "./assets/room-deluxe.jpg";
import suitePhoto from "./assets/room-suite.jpg";
import vipPhoto from "./assets/room-vip.jpg";
import standardPhoto2 from "./assets/rooms/standard-2.jpg";
import standardPhoto3 from "./assets/rooms/standard-3.jpg";
import standardPhoto4 from "./assets/rooms/standard-4.jpg";
import standardPhoto5 from "./assets/rooms/standard-5.jpg";
import deluxePhoto2 from "./assets/rooms/deluxe-2.jpg";
import deluxePhoto3 from "./assets/rooms/deluxe-3.jpg";
import deluxePhoto4 from "./assets/rooms/deluxe-4.jpg";
import deluxePhoto5 from "./assets/rooms/deluxe-5.jpg";
import suitePhoto2 from "./assets/rooms/suite-2.jpg";
import suitePhoto3 from "./assets/rooms/suite-3.jpg";
import suitePhoto4 from "./assets/rooms/suite-4.jpg";
import suitePhoto5 from "./assets/rooms/suite-5.jpg";
import vipPhoto2 from "./assets/rooms/vip-2.jpg";
import vipPhoto3 from "./assets/rooms/vip-3.jpg";
import vipPhoto4 from "./assets/rooms/vip-4.jpg";
import vipPhoto5 from "./assets/rooms/vip-5.jpg";

type RoomTypeCode = "STD" | "DLX" | "SUT" | "VIP";

type RoomProfile = Pick<
  Room,
  | "type"
  | "roomTypeName"
  | "marketingName"
  | "tagline"
  | "pricePerNight"
  | "pricePerHour"
  | "view"
  | "beds"
  | "area"
  | "maxOccupancy"
  | "amenities"
  | "description"
>;

const roomProfiles: Record<RoomTypeCode, RoomProfile> = {
  STD: {
    type: "Standard",
    roomTypeName: "Tiêu chuẩn",
    marketingName: "Tiêu chuẩn",
    tagline: "TIÊU CHUẨN",
    pricePerNight: 1_100_000,
    pricePerHour: 0,
    view: "Hướng thành phố",
    beds: "1 giường đôi",
    area: 28,
    maxOccupancy: 2,
    amenities: ["Wi-Fi tốc độ cao", "Điều hòa", "TV thông minh", "Phòng tắm riêng"],
    description: "Không gian ấm cúng, đầy đủ tiện nghi cho kỳ nghỉ thoải mái bên thành phố biển.",
  },
  DLX: {
    type: "Deluxe",
    roomTypeName: "Cao cấp",
    marketingName: "Cao cấp",
    tagline: "CAO CẤP",
    pricePerNight: 1_650_000,
    pricePerHour: 0,
    view: "Hướng vườn",
    beds: "1 giường Queen",
    area: 34,
    maxOccupancy: 2,
    amenities: ["Wi-Fi tốc độ cao", "Điều hòa", "TV thông minh", "Bồn tắm", "Minibar"],
    description: "Phòng rộng rãi với nội thất gỗ ấm, ánh sáng dịu và góc nghỉ ngơi riêng tư.",
  },
  SUT: {
    type: "Suite",
    roomTypeName: "Suite",
    marketingName: "Suite",
    tagline: "SUITE",
    pricePerNight: 2_600_000,
    pricePerHour: 0,
    view: "Hướng biển",
    beds: "1 giường King",
    area: 52,
    maxOccupancy: 3,
    amenities: ["Wi-Fi tốc độ cao", "Điều hòa", "TV thông minh", "Bồn tắm", "Khu vực tiếp khách"],
    description: "Không gian suite thanh lịch với khu vực tiếp khách riêng và tầm nhìn thoáng đãng.",
  },
  VIP: {
    type: "VIP Suite",
    roomTypeName: "VIP Suite",
    marketingName: "VIP Suite",
    tagline: "VIP SUITE",
    pricePerNight: 4_200_000,
    pricePerHour: 0,
    view: "Hướng biển",
    beds: "1 giường King",
    area: 76,
    maxOccupancy: 4,
    amenities: ["Wi-Fi tốc độ cao", "Điều hòa", "TV thông minh", "Bồn tắm", "Phòng khách riêng", "Ban công"],
    description: "Suite rộng thoáng với ban công riêng, phòng khách và tầm nhìn hướng biển.",
  },
};

const roomPhotos: Record<RoomTypeCode, readonly string[]> = {
  STD: [standardPhoto, standardPhoto2, standardPhoto3, standardPhoto4, standardPhoto5],
  DLX: [deluxePhoto, deluxePhoto2, deluxePhoto3, deluxePhoto4, deluxePhoto5],
  SUT: [suitePhoto, suitePhoto2, suitePhoto3, suitePhoto4, suitePhoto5],
  VIP: [vipPhoto, vipPhoto2, vipPhoto3, vipPhoto4, vipPhoto5],
};

const nextPhotoByType: Record<RoomTypeCode, number> = { STD: 0, DLX: 0, SUT: 0, VIP: 0 };

// Mỗi tầng có 5 phòng; mỗi loại có 5 phòng trong toàn bộ bộ sưu tập.
const floorLayout: readonly (readonly RoomTypeCode[])[] = [
  ["STD", "STD", "STD", "DLX", "SUT"],
  ["STD", "DLX", "DLX", "SUT", "VIP"],
  ["STD", "DLX", "SUT", "VIP", "VIP"],
  ["DLX", "SUT", "SUT", "VIP", "VIP"],
];

/** Bộ sưu tập quảng bá cho trang khách; dữ liệu này chỉ nằm ở frontend. */
export const CUSTOMER_ROOM_CATALOG: Room[] = floorLayout.flatMap((rooms, floorIndex) =>
  rooms.map((code, roomIndex) => {
    const profile = roomProfiles[code];
    const number = `${floorIndex + 1}${String(roomIndex + 1).padStart(2, "0")}`;
    const image = roomPhotos[code][nextPhotoByType[code]++];

    return {
      ...profile,
      image,
      id: number,
      number: `Phòng ${number}`,
      floor: floorIndex + 1,
      roomTypeCode: code,
      status: "available",
      cleanStatus: "clean",
      amenities: [...profile.amenities],
      imageUrls: [image],
    };
  }),
);
