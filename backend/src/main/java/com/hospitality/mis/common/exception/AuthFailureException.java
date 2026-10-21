package com.hospitality.mis.common.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.UNAUTHORIZED)

public class AuthFailureException extends RuntimeException {
    private final String code;

    public AuthFailureException() {
        this("INVALID_CREDENTIALS");
    }

    public AuthFailureException(String code) {
        super(code);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
