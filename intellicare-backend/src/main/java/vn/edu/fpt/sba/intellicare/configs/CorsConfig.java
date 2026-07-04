package vn.edu.fpt.sba.intellicare.configs;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**") // Áp dụng quy tắc này cho toàn bộ các endpoint
                .allowedOriginPatterns("*") // Sau này deploy lên server, đổi dấu * thành cái domain của web
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*");
//                .allowCredentials(true); // Nếu sau này có dùng token/cookie gửi kèm
    }
}