package vn.edu.fpt.sba.intellicare.entities;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@Table(name = "Schools")
@Entity
public class School {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "school_id")
    private Integer schoolId;

    @Column(name = "name", length = 200, nullable = false)
    private String name;

    @Column(name = "address", length = 300)
    private String address;

    @Column(name = "is_active", columnDefinition = "bit not null default 1")
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "school", cascade = CascadeType.ALL)
    private List<SchoolClass> classes;
}
