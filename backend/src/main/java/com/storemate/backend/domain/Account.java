// 계정(사장님/직원) 테이블
package com.storemate.backend.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "accounts")
public class Account {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String username;

    @Column(nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Role role;

    @Column(nullable = false, length = 30)
    private String name;

    @Column(length = 8)
    private String birth;

    private LocalDateTime createdAt = LocalDateTime.now();

    protected Account() {
    }

    public Account(String username, String passwordHash, Role role, String name, String birth) {
        this.username = username;
        this.passwordHash = passwordHash;
        this.role = role;
        this.name = name;
        this.birth = birth;
    }

    public Long getId() { return id; }
    public String getUsername() { return username; }
    public String getPasswordHash() { return passwordHash; }
    public Role getRole() { return role; }
    public String getName() { return name; }
    public String getBirth() { return birth; }
}
