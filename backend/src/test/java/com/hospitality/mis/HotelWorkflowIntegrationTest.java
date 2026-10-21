package com.hospitality.mis;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.util.Map;
import java.util.UUID;
import java.time.LocalDate;
import java.time.ZoneId;
import static org.assertj.core.api.Assertions.assertThat;

/** Runs HTTP commands against V1–V8 in a disposable SQL Server test database. */
@EnabledIfEnvironmentVariable(named="HOTEL_TEST_DB_URL", matches=".+")
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
class HotelWorkflowIntegrationTest {
    @Autowired TestRestTemplate http;
    @Autowired JdbcTemplate sql;
    @DynamicPropertySource static void database(DynamicPropertyRegistry r) {
        String url=System.getenv("HOTEL_TEST_DB_URL");
        if(url==null || !url.matches("(?i).*databaseName=QLKS_Test[;a-zA-Z0-9_]*.*"))
            throw new IllegalArgumentException("Use a disposable QLKS_Test database");
        r.add("spring.datasource.url",()->url);
        r.add("spring.datasource.username",()->System.getenv().getOrDefault("HOTEL_TEST_DB_USER","sa"));
        r.add("spring.datasource.password",()->System.getenv("HOTEL_TEST_DB_PASSWORD"));
        r.add("hotel.jwt.secret",()->"test-only-key-0123456789abcdef-0123456789abcdef-0123456789abcdef");
    }
    JsonNode call(HttpMethod method,String path,String token,Object body,int expected) {
        HttpHeaders headers=new HttpHeaders();headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Idempotency-Key", UUID.randomUUID().toString().replace("-",""));
        if(token!=null)headers.setBearerAuth(token);
        var response=http.exchange(path,method,new HttpEntity<>(body,headers),JsonNode.class);
        assertThat(response.getStatusCode().value()).as("%s %s: %s",method,path,response.getBody()).isEqualTo(expected);
        return response.getBody();
    }
    String login(String employee) {
        return call(HttpMethod.POST,"/api/auth/login",null,Map.of("employee_id",employee,"password","hotel123"),200).get("access_token").asText();
    }
    int count(String query){return sql.queryForObject(query,Integer.class);}
    @Test void reducedHotelWorkflow() {
        assertThat(count("SELECT COUNT(*) FROM sys.tables WHERE name<>'flyway_schema_history'")).isEqualTo(12);
        assertThat(count("SELECT COUNT(*) FROM sys.indexes i JOIN sys.tables t ON i.object_id=t.object_id WHERE t.name<>'flyway_schema_history' AND i.type>0 AND i.is_primary_key=0 AND i.is_unique_constraint=0")).isEqualTo(8);
        assertThat(count("SELECT COUNT(*) FROM sys.objects WHERE type='FN'")).isEqualTo(12);
        assertThat(count("SELECT COUNT(*) FROM sys.views")).isEqualTo(17);
        assertThat(count("SELECT COUNT(*) FROM sys.procedures WHERE is_ms_shipped=0")).isEqualTo(17);
        assertThat(count("SELECT COUNT(*) FROM sys.triggers WHERE is_ms_shipped=0")).isEqualTo(8);
        assertThat(count("SELECT COUNT(*) FROM dbo.flyway_schema_history WHERE success=1")).isEqualTo(8);
        String manager=login("MANAGER"),desk=login("FRONTDESK"),hk=login("HOUSEKEEP"),account=login("ACCOUNTING");
        for(String token:new String[]{manager,desk,hk,account})call(HttpMethod.GET,"/api/auth/me",token,null,200);
        call(HttpMethod.GET,"/api/public/rooms",null,null,200);
        call(HttpMethod.GET,"/api/public/services",null,null,200);
        call(HttpMethod.GET,"/api/auth/employees",desk,null,403);
        call(HttpMethod.POST,"/api/room-types",manager,Map.of("id","TEST","name","Loại kiểm thử","daily_price",700000,"description","Demo"),200);
        call(HttpMethod.PUT,"/api/room-types/TEST",manager,Map.of("id","TEST","name","Loại kiểm thử","daily_price",750000,"description","Demo"),200);
        call(HttpMethod.POST,"/api/rooms/admin",manager,Map.of("id","T01","name","T01","room_type_id","TEST","floor",1),200);
        call(HttpMethod.POST,"/api/auth/employees",manager,Map.of("employee_id","TESTSTAFF","full_name","Nhân viên test","password","hotel123","role","FRONT_DESK","phone","0903111222"),201);
        call(HttpMethod.PATCH,"/api/auth/employees/TESTSTAFF/role",manager,Map.of("role","HOUSEKEEPING"),200);
        JsonNode guest=call(HttpMethod.POST,"/api/guests",desk,Map.of("full_name","Khách test","identity_number","012345678901","phone","0903111223"),201);
        LocalDate arrival=LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).plusDays(2);
        Object booking=Map.of("guest_id",guest.get("id").asLong(),"employee_id","FRONTDESK","rental_type","PACKAGE","rooms",new Object[]{Map.of("room_id","T01","expected_check_in",arrival.atTime(14,0).toString(),"expected_check_out",arrival.plusDays(1).atTime(12,0).toString())});
        long stay=call(HttpMethod.POST,"/api/reservations",desk,booking,201).get("id").asLong();
        call(HttpMethod.POST,"/api/reservations",desk,booking,422);
        call(HttpMethod.POST,"/api/reservations/"+stay+"/check-in",desk,Map.of(),200);
        call(HttpMethod.PATCH,"/api/rooms/T01/status?status=available",hk,null,422);
        call(HttpMethod.GET,"/api/reservations?status=CHECKED_IN",hk,null,200);
        call(HttpMethod.POST,"/api/services",hk,Map.of("id","TEA","name","Trà test","price",50000,"unit","lần"),200);
        call(HttpMethod.POST,"/api/service-usages",hk,Map.of("reservation_id",stay,"service_id","TEA","quantity",2),403);
        long usage=call(HttpMethod.POST,"/api/service-usages",desk,Map.of("reservation_id",stay,"service_id","TEA","quantity",2),200).get("id").asLong();
        call(HttpMethod.GET,"/api/service-usages/summary",hk,null,200);
        call(HttpMethod.PUT,"/api/services/TEA",hk,Map.of("id","TEA","name","Trà test","price",60000,"unit","lần"),200);
        assertThat(sql.queryForObject("SELECT donGia FROM dbo.SuDungDichVu WHERE maSuDung=?",Integer.class,usage)).isEqualTo(50000);
        call(HttpMethod.DELETE,"/api/service-usages/"+usage,hk,null,403);
        call(HttpMethod.DELETE,"/api/service-usages/"+usage,desk,null,200);
        call(HttpMethod.POST,"/api/service-usages",desk,Map.of("reservation_id",stay,"service_id","TEA","quantity",1),200);
        long invoice=call(HttpMethod.POST,"/api/reservations/"+stay+"/check-out",desk,Map.of("payment_method","CASH"),200).get("id").asLong();
        assertThat(sql.queryForObject("SELECT trangThai FROM dbo.Phong WHERE maPhong='T01'",String.class)).isEqualTo("Cần dọn");
        assertThat(sql.queryForObject("SELECT tongTien FROM dbo.HoaDon WHERE maHoaDon=?",Integer.class,invoice)).isEqualTo(810000);
        assertThat(count("SELECT COUNT(*) FROM dbo.BienLai WHERE maHoaDon="+invoice)).isEqualTo(1);
        assertThat(count("SELECT COUNT(*) FROM dbo.GiaoDichThanhToan WHERE maHoaDon="+invoice)).isEqualTo(1);
        call(HttpMethod.GET,"/api/invoices/"+invoice+"/receipts",account,null,200);
        call(HttpMethod.GET,"/api/finance/payments",account,null,200);
        call(HttpMethod.GET,"/api/invoices",account,null,200);
        call(HttpMethod.POST,"/api/invoices/"+invoice+"/payments",account,Map.of("amount",1000,"method","CASH","type","PAYMENT"),422);
        call(HttpMethod.PATCH,"/api/rooms/T01/status?status=cleaning",hk,null,200);
        call(HttpMethod.PATCH,"/api/rooms/T01/status?status=available",hk,null,200);
        Object cancelled=Map.of("guest_id",guest.get("id").asLong(),"employee_id","FRONTDESK","rental_type","PACKAGE","rooms",new Object[]{Map.of("room_id","T01","expected_check_in",arrival.plusDays(30).atTime(14,0).toString(),"expected_check_out",arrival.plusDays(31).atTime(12,0).toString())});
        long next=call(HttpMethod.POST,"/api/reservations",desk,cancelled,201).get("id").asLong();
        call(HttpMethod.POST,"/api/reservations/"+next+"/cancel",desk,Map.of("reason","Khách đổi lịch"),200);
        call(HttpMethod.GET,"/api/governance/audit?page=0&size=10",manager,null,200);
    }
}
