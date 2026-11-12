package com.storemate.backend.domain;

// 재고가 바뀐 이유 (입고, 수량 조정, 폐기)
public enum MovementType {
    IN, ADJUST, DISCARD
}
