// 인수인계 메모 테이블 (urgent = 긴급 메모, resolved = 확인 완료)
package com.storemate.backend.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "handovers")
public class Handover {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Store store;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Account author;

    @Column(nullable = false, length = 500)
    private String content;
    @Column(length=100) private String title;
    @ManyToOne(fetch=FetchType.LAZY) private StoreTask relatedTask;
    public String getTitle(){return title;}
    public StoreTask getRelatedTask(){return relatedTask;}
    public void describe(String title,StoreTask task){this.title=title;relatedTask=task;}

    private boolean urgent;
    private boolean resolved;
    private boolean archived;
    private long revision;
    @ManyToOne(fetch=FetchType.LAZY) private WorkSession workSession;
    @Column(length=30) private String workPart;
    public WorkSession getWorkSession(){return workSession;} public String getWorkPart(){return workPart;}
    public void attachWork(WorkSession session,String part){workSession=session;workPart=part;}
    private LocalDateTime updatedAt;
    private LocalDateTime createdAt = LocalDateTime.now().withNano(0);

    protected Handover() {
    }

    public Handover(Store store, Account author, String content, boolean urgent) {
        this.store = store;
        this.author = author;
        this.content = content;
        this.urgent = urgent;
    }

    public Long getId() { return id; }
    public Store getStore() { return store; }
    public Account getAuthor() { return author; }
    public String getContent() { return content; }
    public boolean isUrgent() { return urgent; }
    public boolean isResolved() { return resolved; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setResolved(boolean resolved) { this.resolved = resolved; }
    public boolean isArchived() { return archived; }
    public long getRevision() { return revision; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void edit(String content, boolean urgent) {
        this.content=content; this.urgent=urgent; resolved=false; revision++; updatedAt=LocalDateTime.now().withNano(0);
    }
    public void archive() { archived=true; revision++; }
}
