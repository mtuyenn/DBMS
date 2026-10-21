package com.hospitality.mis.dao.billing;
import com.hospitality.mis.common.exception.DomainException;
import com.hospitality.mis.dto.billing.ServiceDtos;

import com.hospitality.mis.persistence.VietnameseCodeConverters.ServiceUnitConverter;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
@Repository
public class ServiceCatalogDatabase {
    private final JdbcTemplate jdbc;

    private final ServiceUnitConverter units = new ServiceUnitConverter();
    private final org.springframework.jdbc.core.RowMapper<ServiceDtos.Response> rows = (r, n) ->
            new ServiceDtos.Response(r.getString("maDichVu"), r.getString("ten"), r.getBigDecimal("gia"),
                    units.convertToEntityAttribute(r.getString("donViTinh")), "inroom", r.getString("moTa"),
                    null, 999, 0, false, r.getBoolean("dangHoatDong"), 0, false);
    public ServiceCatalogDatabase(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public Optional<ServiceDtos.Response> find(String id) {
        return jdbc.query("SELECT maDichVu,ten,gia,donViTinh,moTa,dangHoatDong FROM dbo.DichVu WHERE maDichVu=?", rows, id)
                .stream().findFirst();
    }
    public ServiceDtos.Response required(String id) {
        return find(id).orElseThrow(() -> new DomainException("SERVICE_NOT_FOUND", "Không tìm thấy dịch vụ"));
    }
    public List<ServiceDtos.Response> all() {
        return jdbc.query("SELECT maDichVu,ten,gia,donViTinh,moTa,dangHoatDong FROM dbo.DichVu "
                + "WHERE dangHoatDong=1 ORDER BY ten,maDichVu", rows);
    }
    public void save(String id, String name, BigDecimal price, String unit, String description) {
        try {
            jdbc.update("EXEC dbo.uspLuuDichVu ?,?,?,?,?", id, name, price,
                    unit == null || unit.isBlank() ? "lần" : units.convertToDatabaseColumn(unit), description);
        } catch (org.springframework.dao.DataAccessException error) {
            throw new DomainException("SERVICE_SAVE_FAILED", "Không thể lưu dịch vụ: " + error.getMostSpecificCause().getMessage());
        }
    }
}
