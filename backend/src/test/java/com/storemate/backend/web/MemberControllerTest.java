package com.storemate.backend.web;

import com.storemate.backend.domain.*;
import com.storemate.backend.repo.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class MemberControllerTest {
    StoreAccess access = mock(StoreAccess.class);
    StoreMemberRepository members = mock(StoreMemberRepository.class);
    WorkShiftRepository shifts = mock(WorkShiftRepository.class);
    WorkSessionRepository sessions = mock(WorkSessionRepository.class);
    Account owner = mock(Account.class);
    Store store = mock(Store.class);
    Account employee = new Account("staff1", "hash", Role.STAFF, "직원", "20000101");
    StoreMember member;
    MemberController controller;

    @BeforeEach void setup() {
        when(store.getId()).thenReturn(3L);
        when(access.requireOwner(owner, 3L)).thenReturn(store);
        member = new StoreMember(employee, store, Role.STAFF, MemberStatus.APPROVED);
        when(members.findById(8L)).thenReturn(Optional.of(member));
        controller = new MemberController(access, members, shifts, sessions);
    }

    @Test void savesTrimmedPartAndReturnsIt() {
        var result = controller.setPart(owner, 3L, 8L, new Dto.WorkPartRequest(" 오후 "));
        assertEquals("오후", member.getWorkPart());
        assertEquals("오후", result.workPart());
        assertEquals("staff1", result.username());
    }

    @Test void rejectsBlankPartWithoutChangingMembership() {
        var error = assertThrows(ApiException.class,
                () -> controller.setPart(owner, 3L, 8L, new Dto.WorkPartRequest(" ")));
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        assertNull(member.getWorkPart());
    }

    @Test void rejectsMemberOfAnotherStore() {
        Store other = mock(Store.class);
        when(other.getId()).thenReturn(4L);
        when(members.findById(8L)).thenReturn(Optional.of(new StoreMember(employee, other, Role.STAFF, MemberStatus.APPROVED)));
        var error = assertThrows(ApiException.class,
                () -> controller.setPart(owner, 3L, 8L, new Dto.WorkPartRequest("오후")));
        assertEquals(HttpStatus.NOT_FOUND, error.getStatus());
    }

    @Test void rejectsNonOwnerBeforeReadingMember() {
        when(access.requireOwner(owner, 3L)).thenThrow(new ApiException(HttpStatus.FORBIDDEN, "내 매장이 아니에요"));
        assertThrows(ApiException.class, () -> controller.remove(owner, 3L, 8L));
        verify(members, never()).findById(anyLong());
    }

    @Test void activeWorkerCannotBeRemoved() {
        when(sessions.findFirstByAccountAndStoreAndClockOutIsNull(employee, store))
                .thenReturn(Optional.of(new WorkSession(employee, store)));
        var error = assertThrows(ApiException.class, () -> controller.remove(owner, 3L, 8L));
        assertEquals(HttpStatus.CONFLICT, error.getStatus());
        assertEquals(MemberStatus.APPROVED, member.getStatus());
    }

    @Test void removalDeactivatesMembershipWithoutDeletingHistory() {
        when(sessions.findFirstByAccountAndStoreAndClockOutIsNull(employee, store)).thenReturn(Optional.empty());
        controller.remove(owner, 3L, 8L);
        assertEquals(MemberStatus.REJECTED, member.getStatus());
        verify(members, never()).delete(any());
        verifyNoInteractions(shifts);
    }
}
