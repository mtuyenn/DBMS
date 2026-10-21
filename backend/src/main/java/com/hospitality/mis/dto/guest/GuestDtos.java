package com.hospitality.mis.dto.guest;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.validation.constraints.Email;

import jakarta.validation.constraints.NotBlank;

import jakarta.validation.constraints.Pattern;

import jakarta.validation.constraints.Size;



import java.math.BigDecimal;



/** DTO hồ sơ khách và các ràng buộc dữ liệu nhận diện khi tạo mới. */
public final class GuestDtos {

    /** Namespace không trạng thái cho payload khách. */
    private GuestDtos() {}



    /** Request tạo khách; validation bảo vệ độ dài, số điện thoại và email ở biên API. */
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record CreateRequest(
                                /** Họ tên khách, tối đa 100 ký tự và không được trống. */
                                @NotBlank @Size(max = 100) String fullName,
                                /** Số giấy tờ nhận diện, bắt buộc và tối đa 12 ký tự. */
                                @NotBlank @Size(max = 12) String identityNumber,
                                /** Số điện thoại bắt buộc theo pattern hiện hành. */
                                @NotBlank @Size(max = 15) @Pattern(regexp = "[0-9+ .-]{8,15}") String phone,
                                /** Email tùy chọn nhưng phải đúng định dạng nếu có. */
                                @Email @Size(max = 100) String email) {}

    /** Thông tin khách có trong database và tổng chi tiêu thực tế. */
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record Response(
                           /** Khóa khách. */
                           Long id,
                           /** Họ tên. */
                           String fullName,
                           /** Số giấy tờ. */
                           String identityNumber,
                           /** Số điện thoại. */
                           String phone,
                           /** Email liên hệ. */
                           String email,
                           /** Tổng tiền khách đã thanh toán. */
                           BigDecimal totalSpend) {}
}
