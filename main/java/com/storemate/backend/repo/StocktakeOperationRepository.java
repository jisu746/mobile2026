package com.storemate.backend.repo;
import com.storemate.backend.domain.*;import org.springframework.data.jpa.repository.JpaRepository;import java.util.*;
public interface StocktakeOperationRepository extends JpaRepository<StocktakeOperation,Long>{Optional<StocktakeOperation> findByStoreAndClientKey(Store store,String key);List<StocktakeOperation> findTop50ByStoreOrderByIdDesc(Store store);}
