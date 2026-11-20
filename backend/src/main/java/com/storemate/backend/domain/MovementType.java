// 재고가 바뀐 이유 값 (입고 / 수량 조정 / 폐기)
package com.storemate.backend.domain;

public enum MovementType {
    IN, ADJUST, DISCARD
}
