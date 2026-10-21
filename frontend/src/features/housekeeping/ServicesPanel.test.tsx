import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../../shared/api/client";
import { ServicesPanel } from "./ServicesPanel";

afterEach(()=>{cleanup();vi.restoreAllMocks();});
describe("Housekeeping service summaries",()=>{
 it("shows one stay summary and read-only details including cancelled rows",async()=>{
  const request=vi.spyOn(apiClient,"request").mockImplementation(async(path)=>{
   if(path==="/api/services")return [] as any;
   if(path==="/api/service-usages/summary")return [{reservation_id:7,room_ids:["HK904"],guest_name:"Khách An",service_count:2,total_quantity:5,total_amount:540000,usages:[
    {id:1,service_name:"Giặt ủi",quantity:2,unit_price:90000,amount:180000,used_at:"2026-10-21T10:00:00",cancelled:false},
    {id:2,service_name:"Ăn sáng",quantity:3,unit_price:120000,amount:360000,used_at:"2026-10-21T10:00:00",cancelled:false},
    {id:3,service_name:"Giặt đã hủy",quantity:1,unit_price:90000,amount:90000,used_at:"2026-10-21T10:00:00",cancelled:true},
   ]}] as any;
   throw new Error(`Unexpected request ${path}`);
  });
  render(<ServicesPanel/>);
  expect(await screen.findByText("Khách An")).toBeTruthy();
  expect(screen.getByText("HK904")).toBeTruthy();
  expect(screen.queryByRole("button",{name:"Ghi sử dụng"})).toBeNull();
  expect(screen.queryByRole("button",{name:"Hủy sử dụng"})).toBeNull();
  fireEvent.click(screen.getByRole("button",{name:"Xem chi tiết phiếu #7"}));
  const details=screen.getByRole("region",{name:"Chi tiết dịch vụ"});
  expect(within(details).getByText("Giặt đã hủy")).toBeTruthy();
  expect(within(details).getByText("Đã hủy — không tính tiền")).toBeTruthy();
  expect(within(details).getAllByText("Đã ghi nhận")).toHaveLength(2);
  expect(within(details).queryByRole("button",{name:/Hủy/})).toBeNull();
  expect(request.mock.calls.every(([,options])=>!options?.method||options.method==="GET")).toBe(true);
 });
 it("handles an empty summary",async()=>{
  vi.spyOn(apiClient,"request").mockResolvedValue([]);
  render(<ServicesPanel/>);
  expect(await screen.findByText("Chưa có phòng sử dụng dịch vụ.")).toBeTruthy();
 });
});
