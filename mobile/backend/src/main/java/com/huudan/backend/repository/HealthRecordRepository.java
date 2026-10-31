package com.huudan.backend.repository;

import com.huudan.backend.entity.HealthRecord;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface HealthRecordRepository extends JpaRepository<HealthRecord, Long> {

    List<HealthRecord> findByDeviceIdOrderByRecordedAtDesc(String deviceId, Pageable pageable);

    List<HealthRecord> findByUserIdOrderByRecordedAtDesc(UUID userId, Pageable pageable);

    Optional<HealthRecord> findTopByDeviceIdOrderByRecordedAtDesc(String deviceId);

    boolean existsByDeviceIdAndOfflineSeq(String deviceId, Long offlineSeq);
}
