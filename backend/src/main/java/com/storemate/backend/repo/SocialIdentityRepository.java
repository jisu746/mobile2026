package com.storemate.backend.repo;
import com.storemate.backend.domain.SocialIdentity;import org.springframework.data.jpa.repository.JpaRepository;
public interface SocialIdentityRepository extends JpaRepository<SocialIdentity,String>{}
