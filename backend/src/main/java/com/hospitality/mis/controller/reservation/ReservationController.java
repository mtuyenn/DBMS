package com.hospitality.mis.controller.reservation;
import com.hospitality.mis.dto.billing.InvoiceDtos;
import com.hospitality.mis.dto.reservation.ReservationDtos;
import com.hospitality.mis.service.reservation.ReservationService;
import com.hospitality.mis.middleware.security.SecurityActor;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;
@RestController
@RequestMapping("/api/reservations")
public class ReservationController {
    private final ReservationService service;
    public ReservationController(ReservationService service) { this.service=service; }
    @org.springframework.web.bind.annotation.GetMapping
    @PreAuthorize("@departmentAccess.allows(authentication, 'RESERVATION_READ')")
    public ReservationDtos.PageResponse list(
            @org.springframework.web.bind.annotation.RequestParam(required = false) com.hospitality.mis.entity.reservation.ReservationStatus status,
            @org.springframework.web.bind.annotation.RequestParam(name = "guest_id", required = false) Long guestId,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "0") int page,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "20") int size) {
        return service.list(status, guestId, page, size);
    }
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@departmentAccess.allows(authentication, 'RESERVATION_CREATE')")
    public ReservationDtos.Response create(@Valid @RequestBody ReservationDtos.CreateRequest request,
                                           @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {
        return service.create(request, SecurityActor.currentActor(), idempotencyKey);
    }
    @org.springframework.web.bind.annotation.GetMapping("/{id}")
    @PreAuthorize("@departmentAccess.allows(authentication, 'RESERVATION_READ')")
    public ReservationDtos.Response get(@PathVariable Long id) {
        ReservationDtos.Response response = service.get(id);
        String actor = SecurityActor.currentActor();
        if (!actor.equals(response.employeeId()) && !isGlobalReadRole()) {
            throw new AccessDeniedException("Không được phép xem đặt phòng ngoài phạm vi");
        }
        return response;
    }
    private boolean isGlobalReadRole() {
        return com.hospitality.mis.middleware.security.ReservationAccess.hasGlobalRead();
    }
    @PostMapping("/{id}/check-in")
    @PreAuthorize("@departmentAccess.allows(authentication, 'RESERVATION_WRITE')")
    public ReservationDtos.Response checkIn(@PathVariable Long id,
                                            @RequestBody(required = false) ReservationDtos.CheckInRequest request,
                                            @RequestHeader("Idempotency-Key") String idempotencyKey) {
        return service.checkIn(id, request, SecurityActor.currentActor(), idempotencyKey);
    }
    @PostMapping("/{id}/check-out")
    @PreAuthorize("@departmentAccess.allows(authentication, 'RESERVATION_CHECKOUT')")
    public com.hospitality.mis.dto.billing.InvoiceDtos.Response checkOut(
            @PathVariable Long id, @Valid @RequestBody ReservationDtos.CheckOutRequest request,
            @RequestHeader("Idempotency-Key") String idempotencyKey) {
        return service.checkOut(id, request, SecurityActor.currentActor(), idempotencyKey);
    }
    @PostMapping("/{id}/cancel")
    @PreAuthorize("@departmentAccess.allows(authentication, 'RESERVATION_WRITE')")
    public ReservationDtos.Response cancel(@PathVariable Long id, @Valid @RequestBody ReservationDtos.CancelRequest request,
                                           @RequestHeader("Idempotency-Key") String idempotencyKey) {
        return service.cancel(id, request, SecurityActor.currentActor(), idempotencyKey);
    }
    @GetMapping("/{id}/timeline")
    @PreAuthorize("@departmentAccess.allows(authentication, 'RESERVATION_READ')")
    public List<com.hospitality.mis.dto.governance.AuditDtos.Response> timeline(@PathVariable Long id) {
        ReservationDtos.Response response = service.get(id);
        if (!SecurityActor.currentActor().equals(response.employeeId()) && !isGlobalReadRole())
            throw new AccessDeniedException("Không được phép xem timeline ngoài phạm vi");
        return service.timeline(id);
    }
    @PostMapping("/{id}/services")
    @PreAuthorize("@departmentAccess.allows(authentication, 'RESERVATION_SERVICE_WRITE')")
    public ReservationDtos.Response addService(@PathVariable Long id,
                                               @Valid @RequestBody ReservationDtos.AddServiceRequest request,
                                               @RequestHeader("Idempotency-Key") String idempotencyKey) {
        return service.addService(id, request, SecurityActor.currentActor(), idempotencyKey);
    }
}
