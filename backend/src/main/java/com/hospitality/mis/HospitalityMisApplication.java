package com.hospitality.mis;



import org.springframework.boot.SpringApplication;

import org.springframework.boot.autoconfigure.SpringBootApplication;




@SpringBootApplication


/** Điểm khởi động Spring Boot, nơi bật auto-configuration và quét các bean của ứng dụng. */
public class HospitalityMisApplication {



    /** Khởi chạy application context và máy chủ web với tham số JVM hiện tại. */
    public static void main(String[] args) {

        SpringApplication.run(HospitalityMisApplication.class, args);

    }

}
