package com.storemate.backend.domain;
import jakarta.persistence.*;
@Entity @Table(name="inventory_alert_days")public class InventoryAlertDay{@Id @Column(length=120)private String eventKey;protected InventoryAlertDay(){}public InventoryAlertDay(String key){eventKey=key;}}
