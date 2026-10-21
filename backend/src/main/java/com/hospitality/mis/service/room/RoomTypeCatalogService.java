package com.hospitality.mis.service.room;
import com.hospitality.mis.common.exception.DomainException;
import com.hospitality.mis.dao.room.RoomTypeDatabase;
import com.hospitality.mis.dto.room.RoomTypeAdminDtos;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
@Service
public class RoomTypeCatalogService {
    private final RoomTypeDatabase database;
    public RoomTypeCatalogService(RoomTypeDatabase database) { this.database=database; }
    @Transactional(readOnly=true) public List<RoomTypeAdminDtos.Response> list() { return database.list(); }
    @Transactional(readOnly=true) public RoomTypeAdminDtos.Response get(String id) { return database.get(id); }
    @Transactional public RoomTypeAdminDtos.Response save(String id,RoomTypeAdminDtos.Request request) {
        if(!id.equals(request.id())) throw new DomainException("ID_MISMATCH","Mã loại phòng không khớp");
        return database.save(id,request);
    }
}
