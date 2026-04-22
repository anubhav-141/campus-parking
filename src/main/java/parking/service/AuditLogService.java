package parking.service;

import parking.model.AuditLog;
import parking.repository.AuditLogRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

@Service
public class AuditLogService {

    private final AuditLogRepository repository;

    public AuditLogService(AuditLogRepository repository) {
        this.repository = repository;
    }

    public void log(String username, String action, String details) {
        repository.save(new AuditLog(username == null ? "system" : username, action, details));
    }

    public Page<AuditLog> recent(int page, int size) {
        return repository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, Math.min(size, 200)));
    }
}
