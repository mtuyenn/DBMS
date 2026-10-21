package com.hospitality.mis.controller.billing;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.hospitality.mis.dto.billing.InvoiceDtos;
import com.hospitality.mis.service.billing.BillingService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
@RestController
@RequestMapping("/api/invoices")
public class InvoiceController {
    private final BillingService service;
    public InvoiceController(BillingService service) { this.service = service; }
    @GetMapping
    @PreAuthorize("@departmentAccess.allows(authentication, 'BILLING_READ')")
    public InvoiceDtos.PageResponse list(@RequestParam(name = "status", required = false) com.hospitality.mis.entity.billing.PaymentStatus status,
                                         @RequestParam(name = "reservation_id", required = false) Long reservationId,
                                         @RequestParam(name = "from", required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate from,
                                         @RequestParam(name = "to", required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate to,
                                         @RequestParam(name = "page", defaultValue = "0") int page,
                                         @RequestParam(name = "size", defaultValue = "20") int size) {
        return service.list(status, reservationId, from, to, page, size);
    }
    @GetMapping("/reservation/{reservationId}")
    @PreAuthorize("@departmentAccess.allows(authentication, 'BILLING_READ')")
    public InvoiceDtos.Response getByReservation(@PathVariable Long reservationId) { return service.getByReservation(reservationId); }
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record AdjustmentRequest(@NotNull BigDecimal delta, @NotBlank String reason) {}
}
