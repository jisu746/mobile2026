package com.storemate.backend.repo;
import com.storemate.backend.domain.*;import org.springframework.data.jpa.repository.JpaRepository;import java.util.*;
public interface PayrollEntryRepository extends JpaRepository<PayrollEntry,Long>{Optional<PayrollEntry> findByMemberAndPeriodAndClientKey(StoreMember member,String period,String key);List<PayrollEntry> findByMemberAndPeriodOrderByIdAsc(StoreMember member,String period);}
