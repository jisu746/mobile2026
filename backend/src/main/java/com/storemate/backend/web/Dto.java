package com.storemate.backend.web;

import java.util.List;

// 요청/응답 모양. role 은 앱과 같은 소문자 문자열("owner" / "staff")로 주고받는다.
public final class Dto {
    private Dto() {
    }

    public record SignupRequest(String username, String password, String role, String name, String birth) {
    }

    public record LoginRequest(String username, String password, String role) {
    }

    public record CreateStoreRequest(String name, String type, String branch, String address, String addressDetail,
                                     String openTime, String closeTime) {
    }

    public record JoinRequest(String code) {
    }

    // inviteCode 는 사장님에게만 내려준다
    public record StoreView(Long id, String name, String type, String branch, String address, String inviteCode) {
    }

    public record AccountView(String username, String role, String name, String birth,
                              List<StoreView> stores, StoreView pending) {
    }

    public record LoginResponse(String token, AccountView account) {
    }

    public record StoreSummary(String name, String type, String branch, String ownerName) {
    }

    public record JoinResponse(String status) {
    }

    public record MemberRequestView(Long memberId, String username, String name, String requestedAt) {
    }

    // ---- 재고 ----
    // expiry 는 yyyy-MM-dd (없으면 null)
    public record ProductView(String barcode, String name, String category, int stock, int min, String expiry) {
    }

    public record ReceiptItem(String barcode, String name, String category, int qty, String expiry) {
    }

    public record ReceiptRequest(List<ReceiptItem> items) {
    }

    public record ReceiptResult(String barcode, String name, int before, int after, int min) {
    }

    public record UpdateProductRequest(String name, Integer stock) {
    }
}
