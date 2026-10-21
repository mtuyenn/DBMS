package com.hospitality.mis.service.billing;
import com.hospitality.mis.dao.billing.InvoiceDatabase;
import com.hospitality.mis.dto.billing.InvoiceDtos;
import com.hospitality.mis.entity.billing.*;
import com.hospitality.mis.middleware.security.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;
@Service
public class BillingService {
    private final InvoiceDatabase database;


    private final Clock clock;
    public BillingService(InvoiceDatabase database,Clock clock){
        this.database=database;this.clock=clock;
    }
    @Transactional public InvoiceDtos.Response checkOut(Long reservation,LocalDateTime at,PaymentMethod method,String actor){
        String bound=SecurityActor.requireBoundActor(actor);ReservationAccess.requireOperator(bound);
        database.command("checkout",reservation,null,at,method,null,null,null,bound,null,null,null,LocalDateTime.now(clock));
        return database.reservation(reservation).response();
    }
    @Transactional(readOnly=true) public InvoiceDtos.PageResponse list(int page,int size){SecurityActor.currentActor();return database.page(null,null,null,null,page,size);}
    @Transactional(readOnly=true) public InvoiceDtos.Response getByReservation(Long id){
        String actor=SecurityActor.currentActor();
        var invoice=database.reservation(id);scope(invoice,actor);return invoice.response();
    }
    @Transactional(readOnly=true) public InvoiceDtos.PageResponse list(PaymentStatus status,Long reservation,LocalDate from,LocalDate to,int page,int size){SecurityActor.currentActor();return database.page(status,reservation,from,to,page,size);}
    private static void scope(InvoiceDatabase.Snapshot invoice,String actor){
        var auth=SecurityContextHolder.getContext().getAuthentication();
        boolean global=auth!=null&&auth.getAuthorities().stream().anyMatch(a->Set.of("ROLE_ADMIN","ROLE_DIRECTOR","ROLE_MANAGER","ROLE_ACCOUNTING","ROLE_FRONT_DESK").contains(a.getAuthority()));
        boolean customer=SecurityActor.currentPrincipal().isCustomer()&&invoice.customerId()!=null&&invoice.customerId().toString().equals(actor);
        if(!global&&!customer&&!Objects.equals(actor,invoice.employeeId()))throw new AccessDeniedException("Không được phép thao tác ngoài phạm vi đặt phòng");
    }
}
