import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import {afterEach,expect,it,vi} from "vitest";
import {apiClient} from "../../shared/api/client";
import {ServiceUsageHistory} from "./ServiceUsageHistory";
afterEach(()=>{cleanup();vi.restoreAllMocks();});
it("lets reception cancel an active usage and refreshes the stay",async()=>{
 const request=vi.spyOn(apiClient,"request").mockResolvedValue([{id:11,service_name:"Giặt ủi",quantity:2,amount:180000,cancelled:false}]);
 const changed=vi.fn().mockResolvedValue(undefined);
 render(<ServiceUsageHistory reservationId={7} locked={false} onChanged={changed}/>);
 fireEvent.click(await screen.findByRole("button",{name:"Hủy dịch vụ"}));
 await waitFor(()=>expect(request).toHaveBeenCalledWith("/api/service-usages/11",{method:"DELETE"}));
 await waitFor(()=>expect(changed).toHaveBeenCalledOnce());
});
it("disables cancellation once an invoice exists",async()=>{
 vi.spyOn(apiClient,"request").mockResolvedValue([{id:11,service_name:"Giặt ủi",quantity:2,amount:180000,cancelled:false}]);
 render(<ServiceUsageHistory reservationId={7} locked={true} onChanged={vi.fn()}/>);
 expect((await screen.findByRole("button",{name:"Hủy dịch vụ"}) as HTMLButtonElement).disabled).toBe(true);
});
