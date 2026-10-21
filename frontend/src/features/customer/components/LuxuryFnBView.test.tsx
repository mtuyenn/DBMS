import {cleanup,render,screen} from "@testing-library/react";
import {afterEach,expect,it,vi} from "vitest";
import {LuxuryFnBView} from "./LuxuryFnBView";
afterEach(cleanup);
it("shows catalog details and contact links",()=>{
 render(<LuxuryFnBView fnbCategory="all" setFnbCategory={vi.fn()} tableModal={false} setTableModal={vi.fn()} services={[{id:"TEA",category:"fine-dining",title:"Trà chiều",subtitle:"",price:50000,unit:"lần",desc:"Trà chiều tại sảnh",img:"",tag:"",tagColor:""}]} selectedService={null} onSelectService={vi.fn()}/>);
 expect(screen.getAllByText("Trà chiều").length).toBeGreaterThan(0);
 expect(screen.getByRole("link",{name:"Gọi đặt bàn"}).getAttribute("href")).toBe("tel:19006789");
});
