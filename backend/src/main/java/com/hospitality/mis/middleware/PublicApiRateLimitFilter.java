package com.hospitality.mis.middleware;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospitality.mis.common.api.ApiError;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Clock;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/** Fixed-window protection for anonymous catalog/search traffic in the single-node release. */
@Component
public class PublicApiRateLimitFilter extends OncePerRequestFilter {
    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper;
    private final Clock clock;
    private final int requestsPerMinute;

    public PublicApiRateLimitFilter(ObjectMapper objectMapper, Clock clock,
                                    @Value("${hotel.public-api.requests-per-minute:120}") int requestsPerMinute) {
        this.objectMapper = objectMapper;
        this.clock = clock;
        this.requestsPerMinute = Math.max(1, requestsPerMinute);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return !path.startsWith("/api/public/") || path.startsWith("/api/public/payment-callbacks/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        long minute = Instant.now(clock).getEpochSecond() / 60;
        if (windows.size() > 10_000) windows.entrySet().removeIf(entry -> entry.getValue().minute < minute);
        String client = request.getRemoteAddr();
        Window window = windows.compute(client, (key, current) ->
                current == null || current.minute != minute ? new Window(minute) : current);
        if (window.count.incrementAndGet() > requestsPerMinute) {
            response.setStatus(429);
            response.setHeader("Retry-After", "60");
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            objectMapper.writeValue(response.getOutputStream(),
                    new ApiError(Instant.now(clock), 429, "RATE_LIMIT_EXCEEDED",
                            "Quá nhiều yêu cầu, vui lòng thử lại sau", java.util.List.of()));
            return;
        }
        chain.doFilter(request, response);
    }

    private static final class Window {
        private final long minute;
        private final AtomicInteger count = new AtomicInteger();
        private Window(long minute) { this.minute = minute; }
    }
}
