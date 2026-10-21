package com.hospitality.mis.dao.billing;

import com.hospitality.mis.dto.billing.ServiceConsumptionDtos;
import com.hospitality.mis.entity.identity.EmployeeRole;
import com.hospitality.mis.entity.identity.Permission;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;


class ServiceConsumptionDatabaseTest {
    @Test void usesSqlTotalsForMultiRoomStaysAndKeepsCancelledHistory() {
        var usages=new ServiceConsumptionDatabase(null) {
            @Override public List<SummaryRow> summaries() {
                return List.of(new SummaryRow(7,"HK904","Khách An",2,5,new BigDecimal("540000")),
                    new SummaryRow(7,"HK906","Khách An",2,5,new BigDecimal("540000")),
                    new SummaryRow(7,"HK904","Khách An",2,5,new BigDecimal("540000")),
                    new SummaryRow(8,"HK905","Khách Bình",0,0,BigDecimal.ZERO));
            }
            @Override public List<ServiceConsumptionDtos.Response> list(Long reservation) {
                return List.of(row(1,7,2,2,false),row(2,7,3,3,false),row(3,7,1,90000,true),row(4,8,1,90000,true));
            }
        };
        var result=usages.summary();
        assertEquals(2,result.size());
        assertEquals(2,result.get(0).serviceCount());
        assertEquals(5,result.get(0).totalQuantity());
        assertEquals(0,new BigDecimal("540000").compareTo(result.get(0).totalAmount()));
        assertEquals(3,result.get(0).usages().size());
        assertEquals(List.of("HK904","HK906"),result.get(0).roomIds());
        assertEquals("Khách An",result.get(0).guestName());
        assertEquals(0,result.get(1).serviceCount());
        assertEquals(BigDecimal.ZERO,result.get(1).totalAmount());
        assertEquals(1,result.get(1).usages().size());
    }
    @Test void housekeepingCanReadButOnlyReceptionAndManagerCanWriteUsages() {
        assertTrue(EmployeeRole.HOUSEKEEPING.permissions().contains(Permission.SERVICE_READ));
        assertFalse(EmployeeRole.HOUSEKEEPING.permissions().contains(Permission.RESERVATION_SERVICE_WRITE));
        assertTrue(EmployeeRole.FRONT_DESK.permissions().contains(Permission.RESERVATION_SERVICE_WRITE));
        assertTrue(EmployeeRole.MANAGER.permissions().contains(Permission.RESERVATION_SERVICE_WRITE));
    }
    private ServiceConsumptionDtos.Response row(long id,long stay,int quantity,int amount,boolean cancelled) {
        return new ServiceConsumptionDtos.Response(id,stay,"TEST","Dịch vụ",quantity,
            BigDecimal.valueOf(amount/quantity),BigDecimal.valueOf(amount),null,cancelled);
    }
}
