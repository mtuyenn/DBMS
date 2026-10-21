package com.hospitality.mis.entity.identity;
import java.util.Set;
import static com.hospitality.mis.entity.identity.Permission.*;
public enum EmployeeRole {
    MANAGER(Permission.values()),
    FRONT_DESK(ROOM_READ,GUEST_READ,GUEST_WRITE,RESERVATION_READ,RESERVATION_CREATE,RESERVATION_WRITE,
        RESERVATION_CHECKOUT,RESERVATION_SERVICE_WRITE,FRONT_DESK_DASHBOARD,BILLING_READ,PAYMENT_COLLECT,RECEIPT_WRITE,SERVICE_READ),
    HOUSEKEEPING(ROOM_READ,ROOM_WRITE,RESERVATION_READ,SERVICE_READ,SERVICE_WRITE,RESERVATION_SERVICE_WRITE),
    ACCOUNTING(ROOM_READ,RESERVATION_READ,SERVICE_READ,BILLING_READ,PAYMENT_COLLECT,PAYMENT_WRITE,RECEIPT_WRITE,FINANCE_READ);
    private final Set<Permission> permissions;
    EmployeeRole(Permission... grants) { permissions=Set.of(grants); }
    public Set<Permission> permissions() { return permissions; }
    public boolean canManage(EmployeeRole target) { return this==MANAGER && target!=null; }
}
