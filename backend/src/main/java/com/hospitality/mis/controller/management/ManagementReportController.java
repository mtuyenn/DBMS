package com.hospitality.mis.controller.management;

import com.hospitality.mis.dto.management.ManagementReportDtos;
import com.hospitality.mis.service.management.ManagementReportService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Các báo cáo tổng hợp phục vụ riêng cho màn hình quản lý. */
@RestController
@RequestMapping("/api/management/reports")
@PreAuthorize("@departmentAccess.allows(authentication, 'EMPLOYEE_READ')")
public class ManagementReportController {
    private final ManagementReportService service;

    public ManagementReportController(ManagementReportService service) { this.service = service; }

    @GetMapping("/overview")
    public ManagementReportDtos.Overview overview() { return service.overview(); }

    @GetMapping("/room-types")
    public List<ManagementReportDtos.RoomTypePerformance> roomTypePerformance() {
        return service.roomTypePerformance();
    }
}
