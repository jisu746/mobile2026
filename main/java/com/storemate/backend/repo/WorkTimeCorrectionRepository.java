package com.storemate.backend.repo;
import com.storemate.backend.domain.*;import org.springframework.data.jpa.repository.JpaRepository;import java.util.*;
public interface WorkTimeCorrectionRepository extends JpaRepository<WorkTimeCorrection,Long>{List<WorkTimeCorrection> findBySessionOrderByIdAsc(WorkSession session);}
