package com.storemate.backend.repo;
import com.storemate.backend.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface HandoverConfirmationRepository extends JpaRepository<HandoverConfirmation,Long>{
    List<HandoverConfirmation> findByHandoverAndContentRevisionOrderByConfirmedAtAsc(Handover handover,long revision);
    Optional<HandoverConfirmation> findByHandoverAndAccountAndContentRevision(Handover handover,Account account,long revision);
}
