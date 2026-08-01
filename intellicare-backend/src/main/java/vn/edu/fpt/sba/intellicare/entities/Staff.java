package vn.edu.fpt.sba.intellicare.entities;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import vn.edu.fpt.sba.intellicare.enums.Role;

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

    @Column(name = "full_name", nullable = false, columnDefinition = "NVARCHAR(100)")
    private String fullName;

    @Column(name = "email", length = 100)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", length = 20, columnDefinition = "varchar(20)")
    private Role role;

    @Column(name="gender", nullable = false)
    private Boolean gender;

    // Mối quan hệ đệ quy: Một nhân viên thuộc quyền quản lý của một manager
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_id") // Khớp với cột trong SQL
    private Staff manager;

    // Danh sách cấp dưới (tùy chọn, nếu bạn muốn lấy danh sách nhân viên của 1 manager)
    @OneToMany(mappedBy = "manager")
    private List<Staff> subordinates;

    @org.hibernate.annotations.CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
}