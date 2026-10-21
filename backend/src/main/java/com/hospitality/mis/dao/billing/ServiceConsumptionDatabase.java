package com.hospitality.mis.dao.billing;
import com.hospitality.mis.dto.billing.ServiceConsumptionDtos;
import com.hospitality.mis.common.exception.DomainException;
import com.hospitality.mis.dao.reservation.ReservationDatabase;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.List;
@Repository
public class ServiceConsumptionDatabase {
    public record SummaryRow(long reservationId, String roomId, String guestName,
                             long serviceCount, int totalQuantity, java.math.BigDecimal totalAmount) {}
    private final JdbcTemplate jdbc;
    public ServiceConsumptionDatabase(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    public List<SummaryRow> summaries() {
        return jdbc.query("SELECT s.maPhieuDatPhong,d.maPhong,s.tenKhach,s.soDongDichVu,"
                + "s.tongSoLuongDichVu,s.tongTienDichVu "
                + "FROM dbo.vwThongKeDichVuDatPhong s "
                + "JOIN dbo.vwDatPhongChiTiet d ON d.maPhieuDatPhong=s.maPhieuDatPhong "
                + "WHERE EXISTS (SELECT 1 FROM dbo.vwSuDungDichVuChiTiet u "
                + "WHERE u.maPhieuDatPhong=s.maPhieuDatPhong) "
                + "ORDER BY s.maPhieuDatPhong DESC",
            (r,n)->new SummaryRow(r.getLong(1),r.getString(2),r.getString(3),
                    r.getLong(4),r.getInt(5),r.getBigDecimal(6)));
    }
    public List<ServiceConsumptionDtos.Response> list(Long reservation) {
        return jdbc.query("SELECT maSuDung,maPhieuDatPhong,maDichVu,tenDichVu,soLuong,donGia,thanhTien,thoiDiem,daHuy FROM dbo.vwSuDungDichVuChiTiet WHERE (? IS NULL OR maPhieuDatPhong=?) ORDER BY maSuDung DESC",
            (r,n)->new ServiceConsumptionDtos.Response(r.getLong(1),r.getLong(2),r.getString(3),r.getString(4),r.getInt(5),r.getBigDecimal(6),r.getBigDecimal(7),r.getTimestamp(8).toLocalDateTime(),r.getBoolean(9)),reservation,reservation);
    }
    public long create(ServiceConsumptionDtos.CreateRequest request,String actor) {
        try { return jdbc.queryForObject("DECLARE @id BIGINT; EXEC dbo.uspGhiSuDungDichVu ?,?,?,?,@id OUTPUT; SELECT @id",Long.class,request.reservationId(),request.serviceId(),request.quantity(),actor); }
        catch(org.springframework.dao.DataAccessException e) { throw ReservationDatabase.translate(e); }
    }
    public void cancel(long id) {
        if(jdbc.queryForObject("SELECT COUNT(*) FROM dbo.SuDungDichVu WHERE maSuDung=?",Integer.class,id)==0)
            throw new DomainException("SERVICE_USAGE_NOT_FOUND","Không tìm thấy dịch vụ đã dùng");
        try { jdbc.update("EXEC dbo.uspHuySuDungDichVu ?",id); }
        catch(org.springframework.dao.DataAccessException e) { throw ReservationDatabase.translate(e); }
    }
}
