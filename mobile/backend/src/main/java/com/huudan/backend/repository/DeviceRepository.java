package com.huudan.backend.repository;

import com.huudan.backend.entity.Device;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DeviceRepository extends JpaRepository<Device, Long> {
    Optional<Device> findByDeviceId(String deviceId);
    Optional<Device> findByMacAddress(String macAddress);
    List<Device> findByUserId(UUID userId);
    boolean existsByDeviceId(String deviceId);
}
