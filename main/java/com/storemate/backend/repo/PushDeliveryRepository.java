package com.storemate.backend.repo;
import com.storemate.backend.domain.*;import java.util.*;import java.time.*;import org.springframework.data.jpa.repository.*;
public interface PushDeliveryRepository extends JpaRepository<PushDelivery,Long>{
 List<PushDelivery> findTop20ByStatusAndNextAttemptBeforeOrderByIdAsc(String status,LocalDateTime before);
 @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE) @Query("select p from PushDelivery p where p.id=:id") Optional<PushDelivery> lock(@org.springframework.data.repository.query.Param("id")Long id);
}
