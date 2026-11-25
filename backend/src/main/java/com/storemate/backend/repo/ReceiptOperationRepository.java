package com.storemate.backend.repo;
import com.storemate.backend.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface ReceiptOperationRepository extends JpaRepository<ReceiptOperation,Long>{Optional<ReceiptOperation> findByStoreAndClientKey(Store store,String key);}
