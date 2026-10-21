package com.hospitality.mis.common.exception;



/** Lỗi miền mang theo mã ổn định để ánh xạ thành phản hồi API. */
public class DomainException extends RuntimeException {

    /** Mã máy đọc dùng để phân biệt các vi phạm quy tắc miền. */
    private final String code;



    /** Tạo lỗi miền với mã phân loại và thông điệp mô tả. */
    public DomainException(String code, String message) {

        super(message);

        this.code = code;

    }



    /** Trả về mã lỗi được dùng bởi GlobalExceptionHandler. */
    public String getCode() {

        return code;

    }

}
