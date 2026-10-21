package com.hospitality.mis.service.billing;

import com.hospitality.mis.dao.billing.ServiceConsumptionDatabase;
import com.hospitality.mis.dto.billing.ServiceConsumptionDtos;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.stream.Collectors;

@Service
public class ServiceUsageSummaryService {
    private final ServiceConsumptionDatabase usages;
    public ServiceUsageSummaryService(ServiceConsumptionDatabase usages) {
        this.usages=usages;
    }

    @Transactional(readOnly=true)
    public List<ServiceConsumptionDtos.Summary> list() {
        // SQL view calls all three service functions; Java only attaches history.
        var groups=usages.list(null).stream().collect(Collectors.groupingBy(
                ServiceConsumptionDtos.Response::reservationId, LinkedHashMap::new, Collectors.toList()));
        return usages.summaries().stream().map(row -> {
            return new ServiceConsumptionDtos.Summary(row.reservationId(),
                    List.of(row.roomId()), row.guestName(), row.serviceCount(), row.totalQuantity(), row.totalAmount(),
                    List.copyOf(groups.getOrDefault(row.reservationId(), List.of())));
        }).toList();
    }
}
