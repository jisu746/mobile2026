package com.storemate.backend.domain;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name="store_tasks", uniqueConstraints=@UniqueConstraint(columnNames={"store_id","client_key"}))
public class StoreTask {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) private Store store;
    @Column(name="client_key",nullable=false,length=120) private String clientKey;
    @Column(nullable=false,length=100) private String title;
    @Column(nullable=false,length=500) private String description;
    private boolean urgent;
    @ManyToOne(fetch=FetchType.LAZY) private Account assignedTo;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) private Account createdBy;
    private LocalDateTime createdAt=LocalDateTime.now().withNano(0);
    @Column(nullable=false,length=20) private String status="PENDING";
    @ManyToOne(fetch=FetchType.LAZY) private Account reportedBy;
    private LocalDateTime reportedAt;
    @Column(length=500) private String reportNote;
    @ManyToOne(fetch=FetchType.LAZY) private Account reviewedBy;
    private LocalDateTime reviewedAt;
    @Column(length=500) private String reviewNote;
    private long revision;
    private boolean archived;
    protected StoreTask() {}
    public StoreTask(Store store, Account creator,String key,String title,String description,boolean urgent,Account assignee) {
        this.store=store;createdBy=creator;clientKey=key;this.title=title;this.description=description;this.urgent=urgent;assignedTo=assignee;
    }
    public Long getId(){return id;} public Store getStore(){return store;}
    public String getTitle(){return title;} public String getDescription(){return description;}
    public boolean isUrgent(){return urgent;} public Account getAssignedTo(){return assignedTo;}
    public String getStatus(){return status;} public boolean isArchived(){return archived;}
    public long getRevision(){return revision;} public Account getReportedBy(){return reportedBy;}
    public LocalDateTime getReportedAt(){return reportedAt;} public String getReportNote(){return reportNote;}
    public Account getReviewedBy(){return reviewedBy;} public LocalDateTime getReviewedAt(){return reviewedAt;}
    public String getReviewNote(){return reviewNote;} public LocalDateTime getCreatedAt(){return createdAt;}
    public void assign(Account person){assignedTo=person;revision++;}
    public void edit(String title,String description,boolean urgent){this.title=title;this.description=description;this.urgent=urgent;revision++;}
    public void report(Account person,String note){status="SUBMITTED";reportedBy=person;reportedAt=LocalDateTime.now().withNano(0);reportNote=note;reviewedBy=null;reviewedAt=null;revision++;}
    public void review(Account owner,boolean approved,String note){status=approved?"APPROVED":"PENDING";reviewedBy=owner;reviewedAt=LocalDateTime.now().withNano(0);reviewNote=note;revision++;}
    public void archive(){archived=true;revision++;}
}
