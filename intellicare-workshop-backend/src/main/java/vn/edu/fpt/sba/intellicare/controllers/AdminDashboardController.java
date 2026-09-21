package vn.edu.fpt.sba.intellicare.controllers;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.fpt.sba.intellicare.dto.response.DashboardStatsDTO;
import vn.edu.fpt.sba.intellicare.services.IWorkshopService;

@RestController
@RequestMapping("/api/workshop/admin")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
public class AdminDashboardController {

    private final IWorkshopService workshopService;

    @GetMapping("/dashboard")
    public DashboardStatsDTO getDashboard() {
        return workshopService.getDashboardStats();
    }
}
