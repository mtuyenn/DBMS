package com.hospitality.mis.dao.guest;

import com.hospitality.mis.dto.guest.PublicGuestDtos;
import com.hospitality.mis.entity.room.RoomStatus;
import com.hospitality.mis.dao.room.RoomStatusConverter;
import com.hospitality.mis.persistence.VietnameseCodeConverters;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import java.util.Map;

/** Allow-listed public views; no guest, reservation or payment entity is loaded. */
@Repository
public class PublicCatalogDatabase {
    private static final String ROOMS="SELECT maPhong,CONCAT(N'Phòng ',maPhong) AS tenPhong,maLoaiPhong,maLoaiPhong AS maHangPhong,tenLoaiPhong,tenLoaiPhong AS tenQuangBa,moTaLoaiPhong,CAST(NULL AS NVARCHAR(100)) AS khauHieuQuangBa,moTaLoaiPhong AS moTaQuangBa,moTa,giaTheoNgay,CAST(0 AS DECIMAL(12,2)) AS giaTheoGio,CAST(NULL AS DECIMAL(8,2)) AS dienTich,CAST(NULL AS NVARCHAR(100)) AS huongNhin,CAST(NULL AS NVARCHAR(100)) AS loaiGiuong,tang,trangThai,CAST(2 AS INT) AS soKhachToiDa,CAST(NULL AS NVARCHAR(500)) AS duongDanAnhBia FROM dbo.vwPhongQuangCao";
    private final JdbcTemplate jdbc;
    public PublicCatalogDatabase(JdbcTemplate jdbc){this.jdbc=jdbc;}

    public record RoomRow(String id,String name,String typeId,String typeCode,String typeName,String marketingName,
                          String typeDescription,String tagline,String marketingDescription,String description,
                          BigDecimal dailyPrice,BigDecimal hourlyPrice,BigDecimal area,String view,String bedType,
                          Integer floor,RoomStatus status,Integer maxOccupancy,String cover) {}

    public record ListingMedia(Map<String,String> roomImages,Map<String,String> typeImages,
                               Map<String,List<String>> amenities) {
        public String cover(RoomRow room) {
            return roomImages.getOrDefault(room.id(),typeImages.getOrDefault(room.typeId(),room.cover()));
        }
        public List<String> amenitiesFor(RoomRow room) {
            return amenities.getOrDefault(room.typeId(),List.of());
        }
    }

    /** Read public media in batches so catalogue size does not multiply database round trips. */
    public ListingMedia listingMedia() {
        return new ListingMedia(Map.of(),Map.of(),Map.of());
    }

    public List<RoomRow> rooms(String type){
        return jdbc.query(ROOMS+" WHERE (? IS NULL OR maLoaiPhong=?) ORDER BY maLoaiPhong,maPhong",this::roomRow,type,type);
    }
    public Optional<RoomRow> room(String id){
        return jdbc.query(ROOMS+" WHERE maPhong=?",this::roomRow,id).stream().findFirst();
    }
    public List<String> amenities(String type){
        return List.of();
    }
    public List<String> images(RoomRow room){
        return room.cover()==null?List.of():List.of(room.cover());
    }
    private static String publicImageUrl(String path) {
        return path.startsWith("http://")||path.startsWith("https://")?path:"/media/rooms/"+path;
    }
    public List<PublicGuestDtos.ServiceSummary> services(){
        return jdbc.query("SELECT maDichVu,ten,gia,donViTinh,CASE maDichVu "
                + "WHEN N'DINNER' THEN N'Nhà hàng cao cấp' "
                + "WHEN N'SPA60' THEN N'Spa' WHEN N'SPA30' THEN N'Spa' "
                + "WHEN N'AIRPORT' THEN N'Đưa đón' WHEN N'SHUTTLE' THEN N'Đưa đón' "
                + "WHEN N'POOL' THEN N'Giải trí' WHEN N'MEETING' THEN N'Dịch vụ doanh nghiệp' "
                + "ELSE N'Dịch vụ tại phòng' END AS danhMuc,moTa,CAST(NULL AS NVARCHAR(500)) AS duongDanAnh,CAST(0 AS INT) AS thoiLuongPhut "
                + "FROM dbo.vwDichVuQuangCao ORDER BY ten",(rs,n)->
                new PublicGuestDtos.ServiceSummary(rs.getString(1),rs.getString(2),rs.getBigDecimal(3),
                        new VietnameseCodeConverters.ServiceUnitConverter().convertToEntityAttribute(rs.getString(4)),
                        new VietnameseCodeConverters.ServiceCategoryConverter().convertToEntityAttribute(rs.getString(5)),rs.getString(6),rs.getString(7),rs.getInt(8)));
    }
    private RoomRow roomRow(ResultSet r,int n)throws SQLException{
        return new RoomRow(r.getString("maPhong"),r.getString("tenPhong"),r.getString("maLoaiPhong"),r.getString("maHangPhong"),
                r.getString("tenLoaiPhong"),r.getString("tenQuangBa"),r.getString("moTaLoaiPhong"),r.getString("khauHieuQuangBa"),
                r.getString("moTaQuangBa"),r.getString("moTa"),r.getBigDecimal("giaTheoNgay"),r.getBigDecimal("giaTheoGio"),
                r.getBigDecimal("dienTich"),r.getString("huongNhin"),r.getString("loaiGiuong"),(Integer)r.getObject("tang"),
                new RoomStatusConverter().convertToEntityAttribute(r.getString("trangThai")),
                (Integer)r.getObject("soKhachToiDa"),r.getString("duongDanAnhBia"));
    }
}
