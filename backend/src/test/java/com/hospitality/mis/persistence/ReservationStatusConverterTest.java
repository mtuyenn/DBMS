package com.hospitality.mis.persistence;

import com.hospitality.mis.entity.reservation.ReservationStatus;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ReservationStatusConverterTest {
    @Test
    void checkedInFilterMatchesTheStatusStoredBySqlProcedures() {
        var converter = new VietnameseEnumConverters.ReservationStatusConverter();
        assertEquals("Đang ở", converter.convertToDatabaseColumn(ReservationStatus.CHECKED_IN));
        assertEquals(ReservationStatus.CHECKED_IN, converter.convertToEntityAttribute("Đang ở"));
    }
}
