package com.huudan.backend.service;

import com.huudan.backend.dto.UserProfileDto;
import com.huudan.backend.entity.UserProfile;
import com.huudan.backend.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserProfileService {

    private final UserProfileRepository userProfileRepo;

    public Optional<UserProfileDto> getProfile(String userId) {
        if (userId == null || userId.isBlank()) {
            return Optional.empty();
        }
        try {
            UUID uid = UUID.fromString(userId.trim());
            return userProfileRepo.findById(uid).map(this::toDto);
        } catch (IllegalArgumentException e) {
            log.warn("Invalid userId format: {}", userId);
            return Optional.empty();
        }
    }

    @Transactional
    public UserProfileDto updateProfile(UserProfileDto dto) {
        if (dto.getUserId() == null || dto.getUserId().isBlank()) {
            throw new IllegalArgumentException("userId is required for profile update");
        }

        UUID uid;
        try {
            uid = UUID.fromString(dto.getUserId().trim());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid userId UUID format: " + dto.getUserId());
        }

        UserProfile profile = userProfileRepo.findById(uid).orElseGet(() -> {
            UserProfile newProfile = new UserProfile();
            newProfile.setId(uid);
            return newProfile;
        });

        if (dto.getEmail() != null && !dto.getEmail().isBlank()) {
            profile.setEmail(dto.getEmail().trim());
        }
        if (dto.getFullName() != null && !dto.getFullName().isBlank()) {
            profile.setFullName(dto.getFullName().trim());
        }
        if (dto.getAvatarUrl() != null) {
            profile.setAvatarUrl(dto.getAvatarUrl());
        }
        if (dto.getGender() != null) {
            profile.setGender(dto.getGender().toLowerCase().trim());
        }
        if (dto.getDateOfBirth() != null && !dto.getDateOfBirth().isBlank()) {
            try {
                profile.setDateOfBirth(LocalDate.parse(dto.getDateOfBirth().trim()));
            } catch (DateTimeParseException e) {
                log.warn("Could not parse dateOfBirth '{}', ignoring", dto.getDateOfBirth());
            }
        }
        if (dto.getHeight() != null && dto.getHeight() > 0) {
            profile.setHeight(Math.round(dto.getHeight() * 10.0) / 10.0);
        }
        if (dto.getWeight() != null && dto.getWeight() > 0) {
            profile.setWeight(Math.round(dto.getWeight() * 10.0) / 10.0);
        }
        if (dto.getAge() != null && dto.getAge() > 0) {
            profile.setAge(dto.getAge());
        }
        if (dto.getNotes() != null) {
            profile.setNotes(dto.getNotes());
        }

        // Tự động tính toán BMI nếu có đủ chiều cao và cân nặng
        Double h = profile.getHeight();
        Double w = profile.getWeight();
        if (h != null && w != null && h > 0 && w > 0) {
            double hMeters = h / 100.0;
            double computedBmi = Math.round((w / (hMeters * hMeters)) * 10.0) / 10.0;
            profile.setBmi(computedBmi);
        } else if (dto.getBmi() != null) {
            profile.setBmi(dto.getBmi());
        }

        UserProfile saved = userProfileRepo.save(profile);
        log.info("Updated UserProfile: ID={}, Name={}, Height={}, Weight={}, Age={}, BMI={}",
                saved.getId(), saved.getFullName(), saved.getHeight(), saved.getWeight(), saved.getAge(), saved.getBmi());
        return toDto(saved);
    }

    private UserProfileDto toDto(UserProfile p) {
        return UserProfileDto.builder()
                .userId(p.getId() != null ? p.getId().toString() : null)
                .email(p.getEmail())
                .fullName(p.getFullName())
                .avatarUrl(p.getAvatarUrl())
                .gender(p.getGender())
                .dateOfBirth(p.getDateOfBirth() != null ? p.getDateOfBirth().toString() : null)
                .height(p.getHeight())
                .weight(p.getWeight())
                .age(p.getAge())
                .notes(p.getNotes())
                .bmi(p.getBmi())
                .build();
    }
}

