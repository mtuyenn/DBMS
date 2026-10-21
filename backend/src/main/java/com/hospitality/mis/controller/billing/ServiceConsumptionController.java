package com.hospitality.mis.controller.billing;
import com.hospitality.mis.dao.billing.ServiceConsumptionDatabase;
import com.hospitality.mis.dto.billing.ServiceConsumptionDtos;
import com.hospitality.mis.service.billing.ServiceUsageSummaryService;
import com.hospitality.mis.middleware.security.SecurityActor;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
@RestController @RequestMapping("/api/service-usages")
public class ServiceConsumptionController {
    private final ServiceConsumptionDatabase database;
    private final ServiceUsageSummaryService summary;
    public ServiceConsumptionController(ServiceConsumptionDatabase database, ServiceUsageSummaryService summary) { this.database=database; this.summary=summary; }
    @GetMapping @PreAuthorize("@departmentAccess.allows(authentication, 'SERVICE_READ')")
    public List<ServiceConsumptionDtos.Response> list(@RequestParam(name="reservation_id",required=false) Long reservation) { return database.list(reservation); }
    @GetMapping("/summary") @PreAuthorize("@departmentAccess.allows(authentication, 'SERVICE_READ')")
    public List<ServiceConsumptionDtos.Summary> summary() { return summary.list(); }
    @PostMapping @Transactional @PreAuthorize("@departmentAccess.allows(authentication, 'RESERVATION_SERVICE_WRITE')")
    public ServiceConsumptionDtos.Response create(@Valid @RequestBody ServiceConsumptionDtos.CreateRequest request) {
        long id=database.create(request,SecurityActor.currentActor());
        return database.list(request.reservationId()).stream().filter(r->r.id()==id).findFirst().orElseThrow();
    }
    @DeleteMapping("/{id}") @Transactional @PreAuthorize("@departmentAccess.allows(authentication, 'RESERVATION_SERVICE_WRITE')")
    public void cancel(@PathVariable long id) { database.cancel(id); }
}
