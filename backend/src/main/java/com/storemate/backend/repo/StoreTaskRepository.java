package com.storemate.backend.repo;
import com.storemate.backend.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.*;
public interface StoreTaskRepository extends JpaRepository<StoreTask,Long> {
    List<StoreTask> findByStoreAndArchivedFalseOrderByIdDesc(Store store);
    Optional<StoreTask> findByStoreAndClientKey(Store store,String clientKey);
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select t from StoreTask t where t.id=:id")
    Optional<StoreTask> findLockedById(@Param("id") Long id);
}
