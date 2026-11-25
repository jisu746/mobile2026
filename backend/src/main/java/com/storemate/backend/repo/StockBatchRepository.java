package com.storemate.backend.repo;
import com.storemate.backend.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface StockBatchRepository extends JpaRepository<StockBatch,Long> {
 List<StockBatch> findByProductOrderByReceivedAtAscIdAsc(Product product);
}
