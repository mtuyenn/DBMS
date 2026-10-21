import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AccountingStation, { RevenueDashboard } from "./AccountingStation";
import { ReceiptOperations } from "./InvoiceOperations";
import { formatVnd } from "../../shared/utils/money";
import { financeApi as api } from "../../shared/api/finance";
import { authApi } from "../../shared/api/auth";
import type { LedgerPayment, PaymentPage } from "../../shared/types/hotelOperations";

const payment=(id:number):LedgerPayment=>({id,invoice_id:id,reservation_id:1000+id,service_total:0,amount:100000,method:"CASH",type:"PAYMENT",status:"COMPLETED",reference:`REF-${id}`,occurred_at:"2026-10-09T10:00:00",actor_id:"ACCOUNTING"});
const result=(page:number,total=150,size=10):PaymentPage=>({items:Array.from({length:Math.max(0,Math.min(size,total-page*size))},(_,i)=>payment(page*size+i+1)),page,size,totalElements:total,totalPages:Math.ceil(total/size),methodCounts:{CASH:total}});
const mount=()=>render(<AccountingStation onBack={vi.fn()} />);

describe("Accounting server pagination",()=>{
  beforeEach(()=>{
    vi.restoreAllMocks();
    vi.spyOn(authApi,"employeeProfile").mockResolvedValue({employee_id:"ACCOUNTING",full_name:"Kế toán kiểm thử",role:"ACCOUNTING",permissions:[]});
  });
  it("opens the existing transaction ledger and paginates on the server",async()=>{
    const invoices=vi.spyOn(api,"invoices"),payments=vi.spyOn(api,"payments").mockImplementation(async(q)=>result(q?.page??0));
    mount(); await screen.findByText("Hiển thị 1–10 trên 150 giao dịch");
    expect(payments).toHaveBeenCalledTimes(1); expect(payments).toHaveBeenLastCalledWith(expect.objectContaining({page:0,size:10}));
    expect(invoices).not.toHaveBeenCalled(); expect(screen.getByRole("heading",{name:"Sổ giao dịch"})).toBeTruthy();
    fireEvent.click(screen.getByRole("button",{name:"Trang 15"})); await screen.findByText("Hiển thị 141–150 trên 150 giao dịch");
    expect(payments).toHaveBeenCalledTimes(2); expect(payments).toHaveBeenLastCalledWith(expect.objectContaining({page:14,size:10}));
    expect(screen.getByText("PAY-150")).toBeTruthy(); expect(screen.getByText("INV-150")).toBeTruthy(); expect(screen.getByText("1150")).toBeTruthy(); expect(screen.queryByText("PAY-1")).toBeNull();
  });
  it("uses the last server page for next/previous disabled state and styles",async()=>{
    vi.spyOn(api,"payments").mockImplementation(async(q)=>result(q?.page??0,25));
    mount(); await screen.findByText("Hiển thị 1–10 trên 25 giao dịch");
    const prev=screen.getByRole("button",{name:"Trang trước"}) as HTMLButtonElement,next=screen.getByRole("button",{name:"Trang sau"}) as HTMLButtonElement;
    expect(prev.disabled).toBe(true); expect(next.disabled).toBe(false); expect(next.style.cursor).toBe("pointer");
    fireEvent.click(screen.getByRole("button",{name:"Trang 3"})); await screen.findByText("Hiển thị 21–25 trên 25 giao dịch");
    expect(next.disabled).toBe(true); expect(next.style.cursor).toBe("not-allowed"); expect(prev.disabled).toBe(false);
    fireEvent.click(prev); await screen.findByText("Hiển thị 11–20 trên 25 giao dịch");
  });
  it("searches and filters on the server and resets the selected page",async()=>{
    const payments=vi.spyOn(api,"payments").mockImplementation(async(q)=>q?.search?{...result(0,1),items:[payment(150)]}:result(q?.page??0));
    mount(); await screen.findByText("Hiển thị 1–10 trên 150 giao dịch");
    fireEvent.click(screen.getByRole("button",{name:"Trang 15"})); await screen.findByText("PAY-150");
    fireEvent.change(screen.getByPlaceholderText("Tìm mã giao dịch, hóa đơn hoặc đặt phòng..."),{target:{value:"PAY-150"}}); await screen.findByText("Hiển thị 1–1 trên 1 giao dịch");
    expect(payments).toHaveBeenLastCalledWith(expect.objectContaining({page:0,size:10,search:"PAY-150"}));
    fireEvent.change(screen.getByRole("combobox",{name:"Phương thức thanh toán"}),{target:{value:"card"}});
    await waitFor(()=>expect(payments).toHaveBeenLastCalledWith(expect.objectContaining({page:0,method:"CARD",search:"PAY-150"})));
  });
  it("ignores a late response from an obsolete search",async()=>{
    let finish!: (page:PaymentPage)=>void;
    const payments=vi.spyOn(api,"payments").mockImplementation(async(q)=>q?.search==="slow"?new Promise(resolve=>{finish=resolve;}):q?.search?{...result(0,1),items:[payment(150)]}:result(0));
    mount(); await screen.findByText("Hiển thị 1–10 trên 150 giao dịch");
    const search=screen.getByPlaceholderText("Tìm mã giao dịch, hóa đơn hoặc đặt phòng...");
    fireEvent.change(search,{target:{value:"slow"}}); await waitFor(()=>expect(payments).toHaveBeenLastCalledWith(expect.objectContaining({search:"slow"})));
    fireEvent.change(search,{target:{value:"PAY-150"}}); await screen.findByText("PAY-150");
    await act(async()=>{finish({...result(0,1),items:[payment(9)]});}); expect(screen.getByText("PAY-150")).toBeTruthy(); expect(screen.queryByText("PAY-9")).toBeNull();
  });
  it("shows errors explicitly and retries instead of presenting them as empty data",async()=>{
    const payments=vi.spyOn(api,"payments").mockRejectedValueOnce(new Error("Network failed")).mockResolvedValue(result(0,0));
    mount(); await screen.findByRole("alert"); expect(screen.queryByText("Chưa có giao dịch thanh toán phù hợp trong ngày đã chọn.")).toBeNull();
    fireEvent.click(screen.getByRole("button",{name:"Tải lại giao dịch"})); await screen.findByText("Hiển thị 0–0 trên 0 giao dịch"); expect(payments).toHaveBeenCalledTimes(2);
  });
  it("rejects a repeated backend page instead of hiding records",async()=>{
    vi.spyOn(api,"payments").mockResolvedValue(result(0)); mount(); await screen.findByText("Hiển thị 1–10 trên 150 giao dịch");
    fireEvent.click(screen.getByRole("button",{name:"Trang 15"})); expect((await screen.findByRole("alert")).textContent).toContain("Máy chủ trả sai trang"); expect(screen.queryByText("PAY-1")).toBeNull();
  });
  it("exports all matching pages only on demand, including records after 100",async()=>{
    const payments=vi.spyOn(api,"payments").mockImplementation(async(q)=>result(q?.page??0,150,q?.size??10));
    let blob!:Blob; vi.spyOn(URL,"createObjectURL").mockImplementation(value=>{blob=value as Blob;return "blob:test";});
    const click=vi.spyOn(HTMLAnchorElement.prototype,"click").mockImplementation(()=>{});
    mount(); await screen.findByText("Hiển thị 1–10 trên 150 giao dịch"); expect(payments).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button",{name:"Xuất giao dịch CSV"})); await waitFor(()=>expect(click).toHaveBeenCalledTimes(1));
    expect(payments).toHaveBeenCalledWith(expect.objectContaining({page:0,size:100})); expect(payments).toHaveBeenCalledWith(expect.objectContaining({page:1,size:100}));
    const csv=await blob.text(); expect(csv).toContain('"PAY-150","INV-150","1150"'); expect(csv.split("\r\n")).toHaveLength(151);
  });
  it("does not download a partial CSV or hide the loaded page when an export page is missing",async()=>{
    vi.spyOn(api,"payments").mockImplementation(async(q)=>q?.size===100 && q.page===1?{...result(1,150,100),items:[]}:result(q?.page??0,150,q?.size??10));
    const download=vi.spyOn(URL,"createObjectURL");
    mount(); await screen.findByText("Hiển thị 1–10 trên 150 giao dịch");
    fireEvent.click(screen.getByRole("button",{name:"Xuất giao dịch CSV"}));
    expect((await screen.findByRole("alert")).textContent).toContain("trả thiếu");
    expect(download).not.toHaveBeenCalled(); expect(screen.getByText("PAY-1")).toBeTruthy();
    expect(screen.getByText("Hiển thị 1–10 trên 150 giao dịch")).toBeTruthy();
  });
  it("keeps the search when changing date and exports that date in both query and filename",async()=>{
    const payments=vi.spyOn(api,"payments").mockImplementation(async(q)=>result(q?.page??0,1,q?.size??10));
    vi.spyOn(URL,"createObjectURL").mockReturnValue("blob:test");
    let filename="";
    vi.spyOn(HTMLAnchorElement.prototype,"click").mockImplementation(function(this:HTMLAnchorElement){filename=this.download;});
    mount();await screen.findByText("Hiển thị 1–1 trên 1 giao dịch");
    fireEvent.change(screen.getByPlaceholderText("Tìm mã giao dịch, hóa đơn hoặc đặt phòng..."),{target:{value:"PAY-1"}});
    fireEvent.change(screen.getByLabelText("Ngày đối soát"),{target:{value:"2026-10-07"}});
    await waitFor(()=>expect(payments).toHaveBeenLastCalledWith(expect.objectContaining({from:"2026-10-07",to:"2026-10-07",search:"PAY-1"})));
    fireEvent.click(screen.getByRole("button",{name:"Xuất giao dịch CSV"}));
    await waitFor(()=>expect(filename).toBe("payments-2026-10-07.csv"));
    expect(payments).toHaveBeenLastCalledWith(expect.objectContaining({from:"2026-10-07",to:"2026-10-07",search:"PAY-1",size:100}));
  });
  it("shows and filters a MoMo payment under its own method rather than bank transfer",async()=>{
    const payments=vi.spyOn(api,"payments").mockResolvedValue({...result(0,1),items:[{...payment(1),method:"MOMO"}],methodCounts:{MOMO:1}});
    mount();await screen.findByText("PAY-1");
    expect(screen.getByRole("button",{name:"Ví MoMo 1"})).toBeTruthy();
    fireEvent.click(screen.getByRole("button",{name:"Ví MoMo 1"}));
    await waitFor(()=>expect(payments).toHaveBeenLastCalledWith(expect.objectContaining({method:"MOMO"})));
  });
  it("opens the revenue dashboard and receipt ledger from accounting navigation", async () => {
    vi.spyOn(api,"payments").mockResolvedValue(result(0,0));
    const revenue=vi.spyOn(api,"revenueSummary").mockResolvedValue({total_revenue:0,today_revenue:0,daily:[],by_method:[]});
    const receipts=vi.spyOn(api,"receipts").mockResolvedValue({items:[],page:0,size:10,totalElements:0,totalPages:0});
    const unissued=vi.spyOn(api,"unissuedReceipts").mockResolvedValue([]);
    mount(); await screen.findByText("Hiển thị 0–0 trên 0 giao dịch");
    fireEvent.click(screen.getByRole("button",{name:"Báo cáo doanh thu"}));
    await screen.findByText("Chưa có dữ liệu doanh thu theo ngày.");
    expect(revenue).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button",{name:"Quản lý biên lai"}));
    await screen.findByText("Chưa có biên lai nào được phát hành.");
    expect(receipts).toHaveBeenCalledWith({page:0,size:10,invoice_id:undefined});
    expect(unissued).toHaveBeenCalledOnce();
  });
  it("keeps finance idempotency keys within the backend limit", async () => {
    const { newFinanceIdempotencyKey } = await import("../../shared/api/finance");
    const k = newFinanceIdempotencyKey();
    expect(k).toMatch(/^FIN-[a-zA-Z0-9]{1,31}$/);
    expect(k.length).toBeLessThanOrEqual(35);
  });
});


describe("Accounting panels", () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const emptyReceipts = { items: [], page: 0, size: 10, totalElements: 0, totalPages: 0 };

it("shows an unissued-receipt error instead of claiming all payments have receipts", async () => {
  vi.spyOn(api, "receipts").mockResolvedValue(emptyReceipts);
  vi.spyOn(api, "unissuedReceipts").mockRejectedValue(new Error("Không thể đối soát"));
  const retry = vi.fn();
  render(<ReceiptOperations refresh={0} search="" onChanged={retry} />);
  expect((await screen.findByRole("alert")).textContent).toContain("Không thể kiểm tra giao dịch chưa lập biên lai.");
  expect(screen.queryByText(/Toàn bộ các giao dịch/)).toBeNull();
  expect(screen.queryByText("0 giao dịch chờ")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
  expect(retry).toHaveBeenCalledOnce();
});

it("rejects an invalid invoice filter rather than returning every receipt", async () => {
  const receipts = vi.spyOn(api, "receipts");
  vi.spyOn(api, "unissuedReceipts").mockResolvedValue([]);
  render(<ReceiptOperations refresh={0} search="INV-bad" onChanged={vi.fn()} />);
  expect((await screen.findByRole("alert")).textContent).toContain("mã hóa đơn");
  expect(receipts).not.toHaveBeenCalled();
});

it("returns to the first receipt page when the invoice filter changes", async () => {
  const receipts = vi.spyOn(api, "receipts").mockImplementation(async query => ({
    ...emptyReceipts, page: query?.page ?? 0, totalElements: 20, totalPages: 2,
  }));
  vi.spyOn(api, "unissuedReceipts").mockResolvedValue([]);
  const props = { refresh: 0, onChanged: vi.fn() };
  const view = render(<ReceiptOperations {...props} search="" />);
  await screen.findByText("Trang 1/2");
  fireEvent.click(screen.getByRole("button", { name: "Sau" }));
  await screen.findByText("Trang 2/2");
  view.rerender(<ReceiptOperations {...props} search="7" />);
  await waitFor(() => expect(receipts).toHaveBeenLastCalledWith({ page: 0, size: 10, invoice_id: 7 }));
  await screen.findByText("Trang 1/2");
});

it("retries revenue errors and renders the returned daily and method totals", async () => {
  const revenue = vi.spyOn(api, "revenueSummary").mockRejectedValueOnce(new Error("Báo cáo tạm lỗi"))
    .mockResolvedValue({ total_revenue: 150000, today_revenue: 150000,
      daily: [{ date: "2026-10-21", revenue: 150000 }], by_method: [{ method: "Tiền mặt", revenue: 150000 }] });
  render(<RevenueDashboard refresh={0} />);
  await screen.findByRole("alert");
  expect(screen.queryByText(formatVnd(0))).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
  await screen.findByText("21/10/2026");
  expect(screen.getAllByText(formatVnd(150000)).length).toBeGreaterThan(0);
  expect(revenue).toHaveBeenCalledTimes(2);
});

});
