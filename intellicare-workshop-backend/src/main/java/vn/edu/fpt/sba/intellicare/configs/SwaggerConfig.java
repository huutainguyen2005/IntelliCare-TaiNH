package vn.edu.fpt.sba.intellicare.configs;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Cấu hình Swagger / OpenAPI 3.
 * <p>
 * Định nghĩa Security Scheme "X-Device-Key" để trong Swagger UI có nút
 * "Authorize" → điền key → mọi request tự gắn header đúng định dạng.
 * <p>
 * Swagger chỉ bật khi biến môi trường SWAGGER_ENABLED=true
 * (xem application.properties: springdoc.swagger-ui.enabled).
 */
@Configuration
public class SwaggerConfig {

    private static final String DEVICE_KEY_SCHEME = "DeviceApiKey";

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("IntelliCare Workshop API")
                        .description("""
                                API nội bộ cho hệ thống đo sức khoẻ Workshop IntelliCare.

                                **Endpoint ESP32** (`/api/workshop/measurements/submit`) yêu cầu header \
                                `X-Device-Key`. Nhấn **Authorize** (🔒) và dán key vào trước khi test.

                                > ⚠️ `mockWeightKg` chỉ có tác dụng khi `MOCK_BYPASS_ENABLED=true` \
                                và `rawHex = "MOCK"`.
                                """)
                        .version("1.0.0"))
                // Khai báo Security Scheme kiểu API Key qua header X-Device-Key
                .components(new Components()
                        .addSecuritySchemes(DEVICE_KEY_SCHEME,
                                new SecurityScheme()
                                        .type(SecurityScheme.Type.APIKEY)
                                        .in(SecurityScheme.In.HEADER)
                                        .name("X-Device-Key")
                                        .description("Khóa xác thực thiết bị ESP32 — " +
                                                "phải khớp DEVICE_API_KEY trên Render")))
                // Áp dụng scheme này làm mặc định cho toàn bộ API
                .addSecurityItem(new SecurityRequirement().addList(DEVICE_KEY_SCHEME));
    }
}
