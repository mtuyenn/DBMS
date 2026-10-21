package com.hospitality.mis.dao.room;
import com.hospitality.mis.common.exception.DomainException;
import com.hospitality.mis.dto.room.RoomTypeAdminDtos;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.List;
@Repository
public class RoomTypeDatabase {
    private final JdbcTemplate jdbc;
    public RoomTypeDatabase(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    public List<RoomTypeAdminDtos.Response> list() {
        return jdbc.query("SELECT maLoaiPhong,ten,giaTheoNgay,moTa FROM dbo.LoaiPhong WHERE dangHoatDong=1 ORDER BY maLoaiPhong",
            (r,n)->new RoomTypeAdminDtos.Response(r.getString(1),r.getString(2),r.getBigDecimal(3),r.getString(4)));
    }
    public RoomTypeAdminDtos.Response get(String id) {
        return list().stream().filter(r->r.id().equals(id)).findFirst()
            .orElseThrow(()->new DomainException("ROOM_TYPE_NOT_FOUND","Không tìm thấy loại phòng"));
    }
    public RoomTypeAdminDtos.Response save(String id,RoomTypeAdminDtos.Request request) {
        jdbc.update("EXEC dbo.uspLuuLoaiPhong ?,?,?,?",id,request.name(),request.dailyPrice(),request.description());
        return get(id);
    }
}
