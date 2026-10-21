import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CUSTOMER_ROOM_CATALOG } from "../roomCatalog";
import { RoomCardSection } from "./RoomCardSection";

const noop = () => {};

describe("customer room showcase", () => {
  it("keeps 20 rooms across four floors and four room types", () => {
    expect(CUSTOMER_ROOM_CATALOG).toHaveLength(20);
    expect([1, 2, 3, 4].map(floor => CUSTOMER_ROOM_CATALOG.filter(room => room.floor === floor).length))
      .toEqual([5, 5, 5, 5]);

    const typeCodes = ["STD", "DLX", "SUT", "VIP"];
    expect([...new Set(CUSTOMER_ROOM_CATALOG.map(room => room.roomTypeCode))]).toEqual(typeCodes);
    expect(typeCodes.map(code => CUSTOMER_ROOM_CATALOG.filter(room => room.roomTypeCode === code).length))
      .toEqual([5, 5, 5, 5]);
  });

  it("uses a different local photo for every room", () => {
    expect(new Set(CUSTOMER_ROOM_CATALOG.map(room => room.image)).size).toBe(20);
  });

  it("shows standard rooms before higher categories and offers only four floors", () => {
    render(
      <RoomCardSection
        rooms={CUSTOMER_ROOM_CATALOG}
        onViewDetail={noop}
        checkIn="2026-10-22"
        setCheckIn={noop}
        checkOut="2026-10-24"
        setCheckOut={noop}
        guests={2}
        setGuests={noop}
        onSearch={noop}
      />,
    );

    expect(screen.getAllByRole("heading", { level: 3 }).map(heading => heading.textContent)).toEqual([
      "Tiêu chuẩn",
      "Cao cấp",
      "Suite",
      "VIP Suite",
    ]);
    expect(Array.from((screen.getByRole("combobox") as HTMLSelectElement).options).map(option => option.value))
      .toEqual(["ALL", "1", "2", "3", "4"]);
    expect(screen.getByText("Bộ sưu tập không gian lưu trú (20 phòng)")).toBeTruthy();
  });
});
