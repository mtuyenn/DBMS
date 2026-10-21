package com.hospitality.mis.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;
import java.time.ZoneId;

/** Single business timezone source for all hotel workflows. */
@Configuration
public class BusinessTimeConfig {
    @Bean
    public Clock businessClock(@Value("${hotel.time-zone:Asia/Ho_Chi_Minh}") String zoneId) {
        return Clock.system(ZoneId.of(zoneId));
    }
}
