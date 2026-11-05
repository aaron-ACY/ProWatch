package com.huudan.backend.controller;

import com.huudan.backend.dto.UserProfileDto;
import com.huudan.backend.service.UserProfileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class UserController {

    private final UserProfileService userProfileService;

    @GetMapping("/profile")
    public ResponseEntity<UserProfileDto> getProfile(@RequestParam String userId) {
        return userProfileService.getProfile(userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/profile")
    public ResponseEntity<UserProfileDto> updateProfile(@RequestBody UserProfileDto profileDto) {
        UserProfileDto updated = userProfileService.updateProfile(profileDto);
        return ResponseEntity.ok(updated);
    }
}

