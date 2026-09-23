package vn.edu.fpt.sba.intellicare.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
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

    @Mapping(target = "sessionId", source = "id")
    @Mapping(target = "status", expression = "java(entity.getStatus().name())")
    @Mapping(target = "fullName", source = "participant.fullName")
    @Mapping(target = "email", source = "participant.email")
    @Mapping(target = "completedAt", expression = "java(entity.getCompletedAt() != null ? entity.getCompletedAt().toString() : null)")
    WorkshopSessionResponseDTO toDTO(WorkshopSession entity);
}
