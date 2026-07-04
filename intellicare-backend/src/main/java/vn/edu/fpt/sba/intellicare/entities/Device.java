package vn.edu.fpt.sba.intellicare.entities;

import jakarta.persistence.*;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@Table(name = "Devices")
@Entity
public class Device {
    @Id
    @Column(name = "device_id", length = 50)
    private String deviceId; // ID khớp với QR Code dán trên cân

    @Column(name = "location", length = 100)
    private String location;

    @Column(name = "status", length = 20)
    private String status = "Active";

    @OneToMany(mappedBy = "device", cascade = CascadeType.ALL)
    private List<MeasurementSession> measurementSessions;

    @OneToMany(mappedBy = "device", cascade = CascadeType.ALL)
    private List<WeightLog> weightLogs;
}
