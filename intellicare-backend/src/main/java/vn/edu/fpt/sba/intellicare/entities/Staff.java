package vn.edu.fpt.sba.intellicare.entities;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "Staffs")
@Data
@NoArgsConstructor
public class Staff {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "staff_id")
    private Integer staffId;

    @Column(name = "username", unique = true, nullable = false, length = 50)
    private String username;

    @Column(name = "password", nullable = false, length = 255)
    private String password;

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Column(name = "role", length = 20)
    private String role = "Nurse";

    @Column(name="gender",nullable = true)
    private Boolean gender;
    // Mối quan hệ đệ quy: Một nhân viên thuộc quyền quản lý của một manager
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_id") // Khớp với cột trong SQL
    private Staff manager;

    // Danh sách cấp dưới (tùy chọn, nếu bạn muốn lấy danh sách nhân viên của 1 manager)
    @OneToMany(mappedBy = "manager")
    private List<Staff> subordinates;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;
}