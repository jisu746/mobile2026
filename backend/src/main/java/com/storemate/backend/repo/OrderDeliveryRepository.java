package com.storemate.backend.repo;
import com.storemate.backend.domain.*;import org.springframework.data.jpa.repository.JpaRepository;import java.util.*;
public interface OrderDeliveryRepository extends JpaRepository<OrderDelivery,Long>{Optional<OrderDelivery> findByPlanAndClientKey(OrderPlan plan,String key);List<OrderDelivery> findTop50ByPlanOrderByIdDesc(OrderPlan plan);}
