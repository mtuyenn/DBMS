package com.hospitality.mis.service.management;

import com.hospitality.mis.dao.management.ManagementReportDatabase;
import com.hospitality.mis.dto.management.ManagementReportDtos;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ManagementReportService {
    private final ManagementReportDatabase database;

    public ManagementReportService(ManagementReportDatabase database) { this.database = database; }

    @Transactional(readOnly = true)
    public ManagementReportDtos.Overview overview() { return database.overview(); }

    @Transactional(readOnly = true)
    public List<ManagementReportDtos.RoomTypePerformance> roomTypePerformance() {
        return database.roomTypePerformance();
    }
}
