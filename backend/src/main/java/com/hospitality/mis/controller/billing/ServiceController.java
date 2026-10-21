package com.hospitality.mis.controller.billing;
import com.hospitality.mis.dto.billing.ServiceDtos;
import com.hospitality.mis.service.billing.ServiceCatalogService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController @RequestMapping("/api/services")
public class ServiceController {
    private final ServiceCatalogService service;
    public ServiceController(ServiceCatalogService service) { this.service=service; }
    @GetMapping @PreAuthorize("@departmentAccess.allows(authentication, 'SERVICE_READ')")
    public List<ServiceDtos.Response> findAll() { return service.findAll(); }
    @PostMapping @PreAuthorize("@departmentAccess.allows(authentication, 'SERVICE_WRITE')")
    public ServiceDtos.Response create(@Valid @RequestBody ServiceDtos.SaveRequest request) { return service.save(request.id(),request); }
    @PutMapping("/{id}") @PreAuthorize("@departmentAccess.allows(authentication, 'SERVICE_WRITE')")
    public ServiceDtos.Response update(@PathVariable String id,@Valid @RequestBody ServiceDtos.SaveRequest request) { return service.save(id,request); }
}
