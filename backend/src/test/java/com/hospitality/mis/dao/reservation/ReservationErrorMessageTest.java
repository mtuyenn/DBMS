package com.hospitality.mis.dao.reservation;

import com.hospitality.mis.common.exception.DomainException;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import java.sql.SQLException;
import static org.junit.jupiter.api.Assertions.*;

class ReservationErrorMessageTest {
    @Test void cancellationErrorDescribesInvoiceExistenceRatherThanPayment() {
        var sql=new SQLException("Không sửa dịch vụ của hóa đơn đã thanh toán","S0001",51412);
        var translated=ReservationDatabase.translate(new DataIntegrityViolationException("SQL error",sql));
        var domain=assertInstanceOf(DomainException.class,translated);
        assertEquals("INVALID_STATE",domain.getCode());
        assertEquals("Không thể hủy dịch vụ sau khi lập hóa đơn",domain.getMessage());
    }
}
