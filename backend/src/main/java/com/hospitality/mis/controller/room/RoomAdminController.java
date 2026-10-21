package com.hospitality.mis.controller.room;

import com.hospitality.mis.dto.room.RoomAdminDtos;
import com.hospitality.mis.middleware.security.SecurityActor;
import com.hospitality.mis.service.room.RoomAdminService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/rooms/admin")
public class RoomAdminController {
    private final RoomAdminService service;
    public RoomAdminController(RoomAdminService service) { this.service = service; }
    @GetMapping @PreAuthorize("@departmentAccess.allows(authentication, 'ROOM_ADMIN_READ')")
    public List<RoomAdminDtos.Response> list() { return service.list(); }
    @PostMapping @PreAuthorize("@departmentAccess.allows(authentication, 'ROOM_ADMIN_WRITE')")
    public RoomAdminDtos.Response create(@Valid @RequestBody RoomAdminDtos.Request request) { return service.create(request, SecurityActor.currentActor()); }
    @PutMapping("/{id}") @PreAuthorize("@departmentAccess.allows(authentication, 'ROOM_ADMIN_WRITE')")
    public RoomAdminDtos.Response update(@PathVariable String id, @Valid @RequestBody RoomAdminDtos.Request request) { return service.update(id, request, SecurityActor.currentActor()); }
}
