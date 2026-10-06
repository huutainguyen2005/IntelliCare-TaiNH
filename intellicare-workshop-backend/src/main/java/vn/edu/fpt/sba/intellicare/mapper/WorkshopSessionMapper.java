package vn.edu.fpt.sba.intellicare.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import vn.edu.fpt.sba.intellicare.dto.response.WorkshopSessionResponseDTO;
import vn.edu.fpt.sba.intellicare.entities.WorkshopSession;

/**
 * MapStruct tự sinh code implementation lúc build (không cần tự tay viết
 * từng dòng "dto.setX(entity.getX())" như trước) - chỉ cần khai báo
 * interface, annotation processor tự tạo ra class
 * "WorkshopSessionMapperImpl" trong target/generated-sources.
 */
@Mapper(componentModel = "spring")
public interface WorkshopSessionMapper {

    @Mapping(target = "sessionId", expression = "java(entity.getPublicId() != null ? entity.getPublicId().toString() : null)")
    @Mapping(target = "status", expression = "java(entity.getStatus().name())")
    @Mapping(target = "fullName", source = "participant.fullName")
    @Mapping(target = "email", source = "participant.email", qualifiedByName = "maskEmail")
    @Mapping(target = "completedAt", expression = "java(entity.getCompletedAt() != null ? entity.getCompletedAt().toString() : null)")
    WorkshopSessionResponseDTO toDTO(WorkshopSession entity);

    /**
     * Che bớt email ở API công khai (giữ nguyên phần @domain):
     * - username > 4 ký tự : giữ chữ đầu + cuối   nguyenvana@gmail.com -> n********a@gmail.com
     * - username 3-4 ký tự : chỉ giữ chữ đầu      abc@gmail.com        -> a**@gmail.com
     * - username <= 2 ký tự: giữ chữ đầu + "***"  me@gmail.com         -> m***@gmail.com
     */
    @Named("maskEmail")
    default String maskEmail(String email) {
        if (email == null) return null;
        int at = email.indexOf('@');
        if (at <= 0) return "***";

        String user = email.substring(0, at);
        String domain = email.substring(at);
        int len = user.length();

        String maskedUser;
        if (len <= 2) {
            maskedUser = user.charAt(0) + "***";
        } else if (len <= 4) {
            maskedUser = user.charAt(0) + "*".repeat(len - 1);
        } else {
            maskedUser = user.charAt(0) + "*".repeat(len - 2) + user.charAt(len - 1);
        }
        return maskedUser + domain;
    }
}