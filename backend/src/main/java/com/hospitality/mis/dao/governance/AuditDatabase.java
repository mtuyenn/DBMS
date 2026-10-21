package com.hospitality.mis.dao.governance;

import com.hospitality.mis.dto.governance.AuditDtos;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.*;
import java.sql.Timestamp;
import java.time.*;
import java.util.List;

/** Append-only audit read model over the compact demo schema. */
@Repository
public class AuditDatabase {
    private static final String COLUMNS="maNhatKy,maNhanVien,hanhDong,doiTuong,maDoiTuong,chiTiet,thoiDiem";
    private final JdbcTemplate jdbc;
    private final RowMapper<AuditDtos.Response> rows=(r,n)->new AuditDtos.Response(r.getLong(1),r.getString(2),r.getString(3),r.getString(4),r.getString(5),null,r.getString(6),null,null,r.getTimestamp(7).toInstant());
    public AuditDatabase(JdbcTemplate jdbc){this.jdbc=jdbc;}
    public void append(String actor,String action,String type,String id,String before,String after,String reason,String correlation,Instant now){
        String detail=reason;
        if(detail==null&&(before!=null||after!=null)) detail=String.valueOf(before)+" → "+String.valueOf(after);
        if(detail!=null&&detail.length()>500) detail=detail.substring(0,500);
        jdbc.update("INSERT INTO dbo.NhatKyKiemSoat(maNhanVien,doiTuong,maDoiTuong,hanhDong,chiTiet,thoiDiem) "
                        +"SELECT CASE WHEN EXISTS(SELECT 1 FROM dbo.NhanVien WHERE maNhanVien=?) THEN ? ELSE NULL END,?,?,?,?,?",
                actor,actor,type==null?"System":type,id==null?"":id,action==null?"ACTIVITY":action,detail,Timestamp.from(now));
    }
    public List<AuditDtos.Response> list(String actor){return jdbc.query("SELECT TOP(100) "+COLUMNS+" FROM dbo.vwNhatKyKiemSoat WHERE (? IS NULL OR maNhanVien=?) ORDER BY thoiDiem DESC,maNhatKy DESC",rows,actor,actor);}
    public List<AuditDtos.Response> timeline(String type,String id){return jdbc.query("SELECT TOP(100) "+COLUMNS+" FROM dbo.vwNhatKyKiemSoat WHERE doiTuong=? AND maDoiTuong=? ORDER BY thoiDiem,maNhatKy",rows,type,id);}
    public Page<AuditDtos.Response> page(String actor,String action,String type,String id,String correlation,Instant from,Instant to,int page,int size){
        String filter=" WHERE (? IS NULL OR maNhanVien=?) AND (? IS NULL OR hanhDong=?) AND (? IS NULL OR doiTuong=?) AND (? IS NULL OR maDoiTuong=?) AND (? IS NULL OR thoiDiem>=?) AND (? IS NULL OR thoiDiem<?)";
        Object fromTime=from==null?null:Timestamp.from(from),toTime=to==null?null:Timestamp.from(to);
        Object[] args={actor,actor,action,action,type,type,id,id,fromTime,fromTime,toTime,toTime};
        long total=jdbc.queryForObject("SELECT COUNT_BIG(*) FROM dbo.vwNhatKyKiemSoat"+filter,Long.class,args);
        Object[] pageArgs=java.util.Arrays.copyOf(args,args.length+2);pageArgs[args.length]=(long)page*size;pageArgs[args.length+1]=size;
        var content=jdbc.query("SELECT "+COLUMNS+" FROM dbo.vwNhatKyKiemSoat"+filter+" ORDER BY thoiDiem DESC,maNhatKy DESC OFFSET ? ROWS FETCH NEXT ? ROWS ONLY",rows,pageArgs);
        return new PageImpl<>(content,PageRequest.of(page,size),total);
    }
}
