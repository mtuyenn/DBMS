package com.hospitality.mis.common.api;



import java.time.Instant;

import java.util.List;



/** Mô hình lỗi thống nhất mà API trả về cho cả lỗi nghiệp vụ và lỗi dữ liệu đầu vào. */
public record ApiError(

        /** Thời điểm server tạo phản hồi lỗi, dùng để đối chiếu log và request. */
        Instant timestamp,

        /** Mã HTTP của lỗi, ví dụ 400, 409 hoặc 422. */
        int status,

        /** Mã ổn định để frontend và bên gọi phân loại lỗi. */
        String code,

        /** Thông điệp có thể hiển thị hoặc ghi log cho lỗi tổng quát. */
        String message,

        /** Các chi tiết lỗi theo từng trường; thường dùng cho lỗi validate request. */
        List<String> details) {

}
