package com.storemate.backend.repo;
import com.storemate.backend.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.*;

public interface WageRateRepository extends JpaRepository<WageRate, Long> {
    Optional<WageRate> findFirstByMemberAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(StoreMember member, LocalDate date);
    Optional<WageRate> findByMemberAndEffectiveFrom(StoreMember member, LocalDate date);
    List<WageRate> findByMemberOrderByEffectiveFromDesc(StoreMember member);
}
