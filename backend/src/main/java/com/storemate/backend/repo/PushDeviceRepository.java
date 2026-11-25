package com.storemate.backend.repo;
import com.storemate.backend.domain.*;import java.util.*;import org.springframework.data.jpa.repository.JpaRepository;
public interface PushDeviceRepository extends JpaRepository<PushDevice,String>{List<PushDevice> findByAccountAndEnabledTrue(Account account);}
