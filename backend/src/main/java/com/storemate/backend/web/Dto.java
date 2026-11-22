// 요청/응답 JSON 모양 모음 (role 은 앱과 같은 소문자 문자열 "owner" / "staff")
package com.storemate.backend.web;

import java.util.List;

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

    public record MemberRequestView(Long memberId, String username, String name, String requestedAt, String workPart) {
    }

    public record MemberDecisionRequest(String workPart) {}

    public record WorkPartRequest(String workPart) {}

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

    public record UpdateProductRequest(String name, Integer stock, Integer min) {
    }

    // ---- 출퇴근 ----
    // 시각은 yyyy-MM-dd'T'HH:mm:ss (서버 시간대). clockedAt 이 null 이면 출근 전
    public record ClockInRequest(String code) {
    }

    // elsewhere: 다른 매장에서 근무 중이면 그 매장 이름 (이 매장에는 출근할 수 없다)
    public record WorkStatus(String clockedAt, String elsewhere) {
    }

    public record WorkRecord(String clockIn, String clockOut) {
    }

    public record ActiveStaff(String name, String clockIn) {
    }

    // ---- 직원 시급·근무 일정 (사장님이 정하고 직원 화면이 읽는다) ----
    // hourlyWage 가 null 이면 사장님이 아직 정하지 않은 것. date 는 yyyy-MM-dd, 시각은 HH:mm
    public record MeView(Integer hourlyWage, String joinedAt) {
    }

    public record StaffView(Long memberId, String name, Integer hourlyWage, String username, String workPart, String requestedAt) {
    }

    public record WageRequest(Integer hourlyWage) {
    }

    // start/end 가 모두 null 이면 그 날의 일정을 지운다
    public record Shift(String date, String start, String end) {
    }

    public record ShiftsRequest(List<Shift> shifts) {
    }

    // ---- 업무 완료 / 인수인계 / 알림 ----
    public record DoneRequest(String key, boolean done) {
    }

    public record HandoverRequest(String content, boolean urgent) {
    }

    public record ResolveRequest(boolean done) {
    }

    public record HandoverView(Long id, String author, boolean mine, String content, boolean urgent, boolean resolved, String createdAt) {
    }

    public record NotificationView(Long id, String kind, String title, String sub, String createdAt, boolean read) {
    }

    public record ReadRequest(List<Long> ids) {
    }
}
