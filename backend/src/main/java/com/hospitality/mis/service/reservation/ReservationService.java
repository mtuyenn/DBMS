package com.hospitality.mis.service.reservation;
import com.hospitality.mis.common.exception.DomainException;
import com.hospitality.mis.dao.reservation.ReservationDatabase;
import com.hospitality.mis.dto.billing.InvoiceDtos;
import com.hospitality.mis.dto.governance.AuditDtos;
import com.hospitality.mis.dto.reservation.ReservationDtos;
import com.hospitality.mis.entity.reservation.*;
import com.hospitality.mis.middleware.security.*;
import com.hospitality.mis.service.billing.BillingService;
import com.hospitality.mis.service.governance.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
@Service
public class ReservationService {
    private final ReservationDatabase database;
    private final BillingService billing;
    private final AuditService audit;
    private final Clock clock;
    public ReservationService(ReservationDatabase database,BillingService billing,AuditService audit,Clock clock) {
        this.database=database;this.billing=billing;this.audit=audit;this.clock=clock;
    }
    @Transactional public ReservationDtos.Response create(ReservationDtos.CreateRequest request,String actor){return create(request,actor,request==null?null:request.idempotencyKey());}
    @Transactional public ReservationDtos.Response create(ReservationDtos.CreateRequest request,String suppliedActor,String headerKey){
        String actor=operator(suppliedActor);
        if(request==null||request.guestId()==null||request.rentalType()==null)throw error("INVALID_REQUEST","Thiếu nội dung đặt phòng");
        if(!actor.equals(request.employeeId()))throw error("ACTOR_MISMATCH","Actor không khớp nhân viên của booking");
        if(request.depositCollected()&&request.bookingSource()!=null&&!"DIRECT".equalsIgnoreCase(request.bookingSource()))
            throw error("INVALID_REQUEST","Chỉ đặt phòng tại quầy mới được ghi nhận đã thu cọc khi tạo");
        validateRooms(request.rooms());
        if(request.rooms().size()!=1)throw error("ONE_ROOM_PER_STAY","Mỗi lượt lưu trú chỉ hỗ trợ một phòng");
        String key=effectiveKey(request.idempotencyKey(),headerKey);
        BigDecimal deposit=request.deposit();
        String createPayload="CREATE|"+request.guestId()+"|"+actor+"|"+deposit+"|"+request.rentalType()+"|"+request.bookingSource()+"|"+canonicalRooms(request.rooms())
            +(request.depositCollected()?"|DEPOSIT_COLLECTED":"");
        LocalDateTime now=LocalDateTime.now(clock);
        long id=database.create(request.guestId(),actor,null,ReservationDtos.RentalType.PACKAGE,BigDecimal.ZERO,key,
            request.rooms(),actor,now,ReservationStatus.CONFIRMED,null,null,null,null,"DIRECT");
        return database.get(id).response();
    }
    @Transactional(readOnly=true) public ReservationDtos.Response get(Long id){return database.get(id).response();}
    @Transactional(readOnly=true) public ReservationDtos.PageResponse list(ReservationStatus status,Long guest,int page,int size){
        String actor=SecurityActor.currentActor();
        if(page<0||size<1||size>100||guest!=null&&guest<=0)throw error("INVALID_SEARCH","page phải >= 0, size từ 1 đến 100 và guest_id phải > 0");
        return database.page(ReservationAccess.hasGlobalRead()?null:actor,status,guest,page,size);
    }
    @Transactional public ReservationDtos.Response checkIn(Long id,ReservationDtos.CheckInRequest request,String actor,String key){
        String bound=operator(actor);return mutate("reservation-check-in",key,bound,"CHECK_IN|"+id+"|"+(request==null?null:request.at()),()->{
            command("check-in",id,null,null,request==null?null:request.at(),null,null,null,null,null,bound);return get(id);});
    }
    @Transactional public InvoiceDtos.Response checkOut(Long id,ReservationDtos.CheckOutRequest request,String actor,String key){
        String bound=operator(actor);
        if(request==null||request.paymentMethod()==null)throw error("PAYMENT_METHOD_REQUIRED","Chọn phương thức thanh toán khi trả phòng");
        IdempotencySupport.requireKey(key);
        return billing.checkOut(id,request.at(),request.paymentMethod(),bound);
    }
    @Transactional public ReservationDtos.Response cancel(Long id,ReservationDtos.CancelRequest request,String actor,String key) {
        String bound=operator(actor); IdempotencySupport.requireKey(key);
        command("cancel",id,null,null,null,null,null,request==null?null:request.reason(),null,null,bound);
        return get(id);
    }
    @Transactional(readOnly=true) public List<AuditDtos.Response> timeline(Long id){
        get(id);var entries=new ArrayList<>(audit.timeline("RESERVATION",id.toString()));
        for(var document:database.documents(id))entries.addAll(audit.timeline(document.type(),Long.toString(document.id())));
        return entries.stream().distinct().sorted(Comparator.comparing(AuditDtos.Response::createdAt)
            .thenComparing(row->row.id()==null?Long.MAX_VALUE:row.id())).toList();
    }
    @Transactional public ReservationDtos.Response addService(Long id,ReservationDtos.AddServiceRequest request,String actor,String key){
        String bound=SecurityActor.requireBoundActor(actor);
        if(request==null||request.serviceId()==null||request.quantity()==null||request.quantity()<=0)throw error("INVALID_REQUEST","Thiếu thông tin dịch vụ");
        String hash="SERVICE|"+id+"|"+request.serviceId()+"|"+request.quantity()+"|"+request.usedAt()+"|"+request.roomId()+"|"+request.mealPeriod();
        return mutate("reservation-service",key,bound,hash,()->{
            command("service",id,null,null,request.usedAt(),null,null,null,request.serviceId(),request.quantity(),bound);
            return get(id);
        });
    }
    private void command(String action,long id,Long customer,List<ReservationDtos.RoomStay> rooms,LocalDateTime at,
            LocalDateTime newIn,BigDecimal deposit,String reason,String service,Integer quantity,String actor){
        database.command(action,id,customer,rooms,at,newIn,deposit,reason,service,quantity,null,null,actor,LocalDateTime.now(clock));
    }
    private ReservationDtos.Response mutate(String scope,String key,String actor,String payload,java.util.function.Supplier<ReservationDtos.Response> command){
        IdempotencySupport.requireKey(key);
        return command.get();
    }
    public static void validateRooms(List<ReservationDtos.RoomStay> rooms){
        if(rooms==null||rooms.isEmpty())throw error("INVALID_RESERVATION","Booking phải có ít nhất một phòng");
        Set<String> ids=new HashSet<>();for(var r:rooms){
            if(r==null||r.roomId()==null||r.roomId().isBlank()||r.expectedCheckIn()==null||r.expectedCheckOut()==null||!r.expectedCheckIn().isBefore(r.expectedCheckOut()))throw error("INVALID_INTERVAL","Thời gian nhận phải trước thời gian trả");
            if(!ids.add(r.roomId().trim()))throw error("DUPLICATE_ROOM","Không được lặp phòng trong booking");
        }
    }
    public static String canonicalRooms(List<ReservationDtos.RoomStay> rooms){return rooms.stream().map(r->r.roomId().trim()+"@"+r.expectedCheckIn()+"/"+r.expectedCheckOut()+"/"+(r.guestCount()==null?1:r.guestCount())).sorted().reduce((a,b)->a+";"+b).orElse("");}
    private static String effectiveKey(String body,String header){
        if(header!=null&&!header.isBlank()&&body!=null&&!body.isBlank()&&!header.trim().equals(body.trim()))throw error("IDEMPOTENCY_KEY_CONFLICT","Idempotency key header và nội dung không giống nhau");
        return IdempotencySupport.requireKey(header==null||header.isBlank()?body:header);
    }
    private static String operator(String actor){String bound=SecurityActor.requireBoundActor(actor);ReservationAccess.requireOperator(bound);return bound;}
    private static DomainException error(String code,String text){return new DomainException(code,text);}
}
