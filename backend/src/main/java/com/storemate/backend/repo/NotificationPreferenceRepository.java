package com.storemate.backend.repo;
import com.storemate.backend.domain.NotificationPreference;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface NotificationPreferenceRepository extends JpaRepository<NotificationPreference,Long>{
 Optional<NotificationPreference> findByAccountId(Long accountId);
}
