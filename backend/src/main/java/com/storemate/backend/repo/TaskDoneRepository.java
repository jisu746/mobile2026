// 업무 완료 표시 테이블 조회·저장 창구
package com.storemate.backend.repo;

import com.storemate.backend.domain.Store;
import com.storemate.backend.domain.TaskDone;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TaskDoneRepository extends JpaRepository<TaskDone, Long> {
    List<TaskDone> findByStoreAndDay(Store store, LocalDate day);

    Optional<TaskDone> findByStoreAndTaskKeyAndDay(Store store, String taskKey, LocalDate day);
}
