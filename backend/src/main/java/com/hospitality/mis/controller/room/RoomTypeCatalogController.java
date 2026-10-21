package com.hospitality.mis.controller.room;
import com.hospitality.mis.dto.room.RoomTypeAdminDtos;
import com.hospitality.mis.service.room.RoomTypeCatalogService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController @RequestMapping("/api/room-types")
public class RoomTypeCatalogController {
    private final RoomTypeCatalogService service;
    public RoomTypeCatalogController(RoomTypeCatalogService service) { this.service=service; }
    @GetMapping @PreAuthorize("@departmentAccess.allows(authentication, 'ROOM_READ')")
    public List<RoomTypeAdminDtos.Response> list() { return service.list(); }
    @GetMapping("/{id}") @PreAuthorize("@departmentAccess.allows(authentication, 'ROOM_READ')")
    public RoomTypeAdminDtos.Response get(@PathVariable String id) { return service.get(id); }
    @PostMapping @PreAuthorize("@departmentAccess.allows(authentication, 'ROOM_CATALOG_WRITE')")
    public RoomTypeAdminDtos.Response create(@Valid @RequestBody RoomTypeAdminDtos.Request request) { return service.save(request.id(),request); }
    @PutMapping("/{id}") @PreAuthorize("@departmentAccess.allows(authentication, 'ROOM_CATALOG_WRITE')")
    public RoomTypeAdminDtos.Response update(@PathVariable String id,@Valid @RequestBody RoomTypeAdminDtos.Request request) { return service.save(id,request); }
}
