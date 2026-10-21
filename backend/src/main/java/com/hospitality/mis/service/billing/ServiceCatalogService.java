package com.hospitality.mis.service.billing;
import com.hospitality.mis.dao.billing.ServiceCatalogDatabase;
import com.hospitality.mis.dto.billing.ServiceDtos;
import com.hospitality.mis.common.exception.DomainException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
@Service
public class ServiceCatalogService {
    private final ServiceCatalogDatabase database;
    public ServiceCatalogService(ServiceCatalogDatabase database) { this.database=database; }
    @Transactional(readOnly=true) public List<ServiceDtos.Response> findAll() { return database.all(); }
    @Transactional public ServiceDtos.Response save(String id,ServiceDtos.SaveRequest request) {
        if(!id.equals(request.id())) throw new DomainException("ID_MISMATCH","Mã dịch vụ không khớp");
        database.save(id,request.name(),request.price(),request.unit(),request.description());
        return database.required(id);
    }
}
