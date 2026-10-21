package com.hospitality.mis.config;



import org.springframework.context.annotation.Bean;

import org.springframework.context.annotation.Configuration;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import org.springframework.security.crypto.password.PasswordEncoder;

import org.springframework.security.authentication.AuthenticationManager;

import org.springframework.security.authentication.ProviderManager;

import org.springframework.security.authentication.dao.DaoAuthenticationProvider;

import org.springframework.security.core.userdetails.UserDetailsService;



@Configuration
/** Khai báo các dependency nền tảng cho đăng nhập bằng mật khẩu và quản lý authentication. */
public class SecurityBeans {

    @Bean

    /** Mã hóa mật khẩu bằng BCrypt với cost cố định; mật khẩu thô không được lưu hay so sánh thủ công. */
    PasswordEncoder passwordEncoder() {

        return new BCryptPasswordEncoder(12);

    }



    @Bean

    /** Nối UserDetailsService và PasswordEncoder vào provider duy nhất của luồng đăng nhập. */
    AuthenticationManager authenticationManager(UserDetailsService userDetailsService,

                                                PasswordEncoder passwordEncoder) {

        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();

        provider.setUserDetailsService(userDetailsService);

        provider.setPasswordEncoder(passwordEncoder);

        return new ProviderManager(provider);

    }

}
