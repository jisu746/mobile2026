package com.storemate.backend.repo;
import com.storemate.backend.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface PayrollRuleDraftRepository extends JpaRepository<PayrollRuleDraft,Long> {
 Optional<PayrollRuleDraft> findByMemberAndPeriod(StoreMember member,String period);
}
