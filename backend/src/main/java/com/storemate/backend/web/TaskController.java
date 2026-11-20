// 오늘의 업무 완료 표시 API (업무 목록은 앱이 재고로 만들고, 여기서는 마친 업무만 저장한다)
package com.storemate.backend.web;

import com.storemate.backend.domain.Account;
import com.storemate.backend.domain.Store;
import com.storemate.backend.domain.TaskDone;
import com.storemate.backend.repo.TaskDoneRepository;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/stores/{storeId}/tasks")
public class TaskController {
    private final StoreAccess access;
    private final TaskDoneRepository done;

    public TaskController(StoreAccess access, TaskDoneRepository done) {
        this.access = access;
        this.done = done;
    }

    private List<String> keys(Store s) {
        return done.findByStoreAndDay(s, LocalDate.now()).stream().map(TaskDone::getTaskKey).toList();
    }

    @GetMapping("/done")
    @Transactional(readOnly = true)
    public List<String> list(@RequestAttribute(AuthInterceptor.ACCOUNT) Account account, @PathVariable Long storeId) {
        return keys(access.requireMember(account, storeId));
    }

    @PostMapping("/done")
    @Transactional
    public List<String> mark(@RequestAttribute(AuthInterceptor.ACCOUNT) Account account, @PathVariable Long storeId,
                             @RequestBody Dto.DoneRequest r) {
        Store s = access.requireMember(account, storeId);
        if (r.key() == null || r.key().isBlank() || r.key().length() > 60)
            throw new ApiException(HttpStatus.BAD_REQUEST, "업무 번호가 올바르지 않아요");
        LocalDate today = LocalDate.now();
        var existing = done.findByStoreAndTaskKeyAndDay(s, r.key(), today);
        if (r.done() && existing.isEmpty()) done.save(new TaskDone(s, account, r.key(), today));
        if (!r.done()) existing.ifPresent(done::delete);
        done.flush();
        return keys(s);
    }
}
