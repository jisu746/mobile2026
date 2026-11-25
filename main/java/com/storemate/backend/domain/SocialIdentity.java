package com.storemate.backend.domain;
import jakarta.persistence.*;
@Entity @Table(name="social_identities") public class SocialIdentity {
 @Id @Column(length=80) private String id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) private Account account;
 protected SocialIdentity(){}public SocialIdentity(String id,Account account){this.id=id;this.account=account;}public Account getAccount(){return account;}
}
