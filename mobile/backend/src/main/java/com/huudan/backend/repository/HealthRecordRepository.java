package com.huudan.backend.repository;

import com.huudan.backend.entity.HealthRecord;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface HealthRecordRepository extends JpaRepository<HealthRecord, Long> {

    List<HealthRecord> findByDeviceIdOrderByRecordedAtDesc(String deviceId, Pageable pageable);

    List<HealthRecord> findByUserIdOrderByRecordedAtDesc(UUID userId, Pageable pageable);

    Optional<HealthRecord> findTopByDeviceIdOrderByRecordedAtDesc(String deviceId);

    Optional<HealthRecord> findTopByUserIdOrderByRecordedAtDesc(UUID userId);

    boolean existsByDeviceIdAndOfflineSeq(String deviceId, Long offlineSeq);

    List<HealthRecord> findByDeviceIdAndRecordedAtBetweenOrderByRecordedAtAsc(String deviceId, Instant start, Instant end);

    List<HealthRecord> findByDeviceIdAndRecordedAtBetweenOrderByRecordedAtDesc(String deviceId, Instant start, Instant end);

    List<HealthRecord> findByUserIdAndRecordedAtBetweenOrderByRecordedAtAsc(UUID userId, Instant start, Instant end);

    List<HealthRecord> findByUserIdAndRecordedAtBetweenOrderByRecordedAtDesc(UUID userId, Instant start, Instant end);

    long countByDeviceIdAndRecordedAtBetween(String deviceId, Instant start, Instant end);

    long countByUserIdAndRecordedAtBetween(UUID userId, Instant start, Instant end);

    long countByDeviceId(String deviceId);

    long countByUserId(UUID userId);
}
