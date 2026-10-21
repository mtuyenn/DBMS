import {afterEach,expect,it,vi} from "vitest";
import {apiClient} from "./client";
import {housekeepingTechnicalApi as api} from "./housekeepingTechnical";
afterEach(()=>vi.restoreAllMocks());
it("updates the selected room through the status endpoint",async()=>{
 const request=vi.spyOn(apiClient,"request").mockResolvedValue({});
 await api.updateRoomStatus("101","available",{idempotencyKey:"clean-101"});
 expect(request).toHaveBeenCalledWith("/api/rooms/101/status?status=available",{method:"PATCH",idempotencyKey:"clean-101"});
});
