package com.storemate.backend.repo;
import com.storemate.backend.domain.*;import org.springframework.data.jpa.repository.JpaRepository;import java.util.*;
public interface OrderPlanRepository extends JpaRepository<OrderPlan,Long>{Optional<OrderPlan> findByStoreAndClientKey(Store store,String key);List<OrderPlan> findTop50ByStoreOrderByIdDesc(Store store);}
