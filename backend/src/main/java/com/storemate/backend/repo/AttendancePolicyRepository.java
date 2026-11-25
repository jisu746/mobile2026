package com.storemate.backend.repo;
import com.storemate.backend.domain.AttendancePolicy;
import org.springframework.data.jpa.repository.JpaRepository;
public interface AttendancePolicyRepository extends JpaRepository<AttendancePolicy,Long>{}
