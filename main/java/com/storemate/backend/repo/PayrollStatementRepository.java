package com.storemate.backend.repo;
import com.storemate.backend.domain.*;import org.springframework.data.jpa.repository.JpaRepository;import java.util.*;
public interface PayrollStatementRepository extends JpaRepository<PayrollStatement,Long>{Optional<PayrollStatement> findByMemberAndPeriod(StoreMember member,String period);}
