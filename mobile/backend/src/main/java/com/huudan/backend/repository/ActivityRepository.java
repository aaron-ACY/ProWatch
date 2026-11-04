package com.huudan.backend.repository;

import com.huudan.backend.entity.Activity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ActivityRepository extends JpaRepository<Activity, Long> {

    List<Activity> findByDeviceIdOrderByRecordedAtDesc(String deviceId, Pageable pageable);

    List<Activity> findByUserIdOrderByRecordedAtDesc(UUID userId, Pageable pageable);

    Optional<Activity> findFirstByDeviceIdOrderByRecordedAtDesc(String deviceId);

    boolean existsByDeviceIdAndOfflineSeq(String deviceId, Long offlineSeq);

    List<Activity> findByDeviceIdAndRecordedAtBetweenOrderByRecordedAtDesc(String deviceId, Instant start, Instant end);
}


