package com.huudan.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileDto {
    private String userId;
    private String email;
    private String fullName;
    private String avatarUrl;
    private String gender;
    private String dateOfBirth;
    private Double height;
    private Double weight;
    private Integer age;
    private String notes;
    private Double bmi;
}

