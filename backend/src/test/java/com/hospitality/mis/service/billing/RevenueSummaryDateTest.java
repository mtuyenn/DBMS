package com.hospitality.mis.service.billing;

import com.hospitality.mis.dao.billing.PaymentDatabase;
import org.junit.jupiter.api.Test;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import static org.mockito.Mockito.*;

class RevenueSummaryDateTest {
    @Test void usesTheConfiguredBusinessDayAcrossUtcMidnight() {
        var database = mock(PaymentDatabase.class);
        var clock = Clock.fixed(Instant.parse("2026-10-20T18:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
        var service = new PaymentTransactionService(database, null, clock, null);
        service.revenueSummary();
        verify(database).revenueSummary(LocalDate.of(2026, 10, 21));
    }
}
