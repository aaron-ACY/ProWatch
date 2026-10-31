package com.huudan.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Topic broadcast cho App dang ky nhan du lieu thoi gian thuc tu XIAO ESP32-S3
        config.enableSimpleBroker("/topic");
        // Prefix gui len tu client (neu co)
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Endpoint WebSocket cho App va Web
        registry.addEndpoint("/ws/watch")
                .setAllowedOriginPatterns("*");
        // Ho tro SockJS fallback cho moi trinh duyet
        registry.addEndpoint("/ws/watch")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }
}
