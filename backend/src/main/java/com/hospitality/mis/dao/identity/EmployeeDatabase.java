package com.hospitality.mis.dao.identity;
import com.hospitality.mis.common.exception.DomainException;
import com.hospitality.mis.dto.auth.EmployeeAdminDtos;
import com.hospitality.mis.entity.identity.Employee;
import com.hospitality.mis.entity.identity.EmployeeRole;
import com.hospitality.mis.persistence.VietnameseEnumConverters.*;
import org.springframework.jdbc.core.*;
import org.springframework.stereotype.Repository;
import java.sql.*;
import java.time.*;
import java.util.*;
@Repository
public class EmployeeDatabase {
    public record Snapshot(String employeeId,String fullName,String password,EmployeeRole role,String phone,String address,String email,boolean mustChangePassword,boolean enabled,boolean accountNonLocked,int failedLoginAttempts,Instant lastLoginAt,Instant lastFailedLoginAt,Employee.EmploymentStatus employmentStatus,LocalDate leaveStart,LocalDate leaveEnd){
        public EmployeeAdminDtos.Response response(){return new EmployeeAdminDtos.Response(employeeId,fullName,phone,address,role,enabled,accountNonLocked,failedLoginAttempts,lastLoginAt,lastFailedLoginAt,employmentStatus,leaveStart,leaveEnd,email,mustChangePassword);}
    }
    private static final String COLUMNS="maNhanVien,hoVaTen,matKhau,vaiTro,soDienThoai,dangHoatDong";
    private final JdbcTemplate jdbc;
    private final EmployeeRoleConverter roles=new EmployeeRoleConverter();
    private final RowMapper<Snapshot> rows=(r,n)->new Snapshot(r.getString("maNhanVien"),r.getString("hoVaTen"),r.getString("matKhau"),roles.convertToEntityAttribute(r.getString("vaiTro")),r.getString("soDienThoai"),null,null,false,r.getBoolean("dangHoatDong"),true,0,null,null,Employee.EmploymentStatus.WORKING,null,null);
    public EmployeeDatabase(JdbcTemplate jdbc){this.jdbc=jdbc;}
    public Optional<Snapshot> find(String id){return jdbc.query("SELECT "+COLUMNS+" FROM dbo.NhanVien WHERE maNhanVien=?",rows,id).stream().findFirst();}
    public Optional<Snapshot> lock(String id){return jdbc.query("SELECT "+COLUMNS+" FROM dbo.NhanVien WITH (UPDLOCK,ROWLOCK) WHERE maNhanVien=?",rows,id).stream().findFirst();}
    public List<Snapshot> list(){return jdbc.query("SELECT "+COLUMNS+" FROM dbo.NhanVien ORDER BY maNhanVien",rows);}
    public Snapshot create(String id,String name,String password,EmployeeRole role,String phone,String address,String email,boolean temporary,boolean auto){
        requireSupportedRole(role);
        jdbc.update("EXEC dbo.uspLuuNhanVien ?,?,?,?,?",id,name,password,roles.convertToDatabaseColumn(role),phone);
        return find(id).orElseThrow();
    }
    public Snapshot write(String command,String id,String password,EmployeeRole role,Boolean flag,Employee.EmploymentStatus status,LocalDate start,LocalDate end,Instant now){
        Snapshot current=find(id).orElseThrow(()->new DomainException("EMPLOYEE_NOT_FOUND","Không tìm thấy nhân viên"));
        if("enabled".equals(command)) {
            jdbc.update("UPDATE dbo.NhanVien SET dangHoatDong=? WHERE maNhanVien=?",Boolean.TRUE.equals(flag),id);
        } else if ("role".equals(command)) {
            requireSupportedRole(role);
            jdbc.update("EXEC dbo.uspDoiVaiTroNhanVien ?,?,?",id,roles.convertToDatabaseColumn(role),
                    com.hospitality.mis.middleware.security.SecurityActor.currentActor());
        } else if ("password".equals(command) || "own-password".equals(command)) {
            EmployeeRole nextRole=role==null?current.role():role;
            requireSupportedRole(nextRole);
            jdbc.update("EXEC dbo.uspLuuNhanVien ?,?,?,?,?",id,current.fullName(),password==null?null:password,
                    roles.convertToDatabaseColumn(nextRole),current.phone());
        } else {
            throw new DomainException("UNSUPPORTED_EMPLOYEE_CHANGE","Chỉ hỗ trợ vai trò, trạng thái và mật khẩu nhân viên");
        }
        return find(id).orElseThrow();
    }
    private static void requireSupportedRole(EmployeeRole role){
        if(role!=EmployeeRole.FRONT_DESK&&role!=EmployeeRole.MANAGER&&role!=EmployeeRole.HOUSEKEEPING&&role!=EmployeeRole.ACCOUNTING)
            throw new DomainException("UNSUPPORTED_EMPLOYEE_ROLE","Vai trò phải là Lễ tân, Quản lý, Buồng phòng/Dịch vụ hoặc Kế toán");
    }
}
