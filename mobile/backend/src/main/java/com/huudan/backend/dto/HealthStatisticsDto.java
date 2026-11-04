package com.huudan.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HealthStatisticsDto {
    private String timeframe;   // "today" | "week" | "month"
    private String periodText;  // "hôm nay" | "tuần này" | "tháng này"
    private Boolean hasData;

    // Nhịp tim
    private Integer avgHr;
    private Integer minHr;
    private Integer maxHr;
    private Integer latestHr;
    private String latestHrTime;
    private Integer hrCount;
    private List<ChartPointDto> hrPoints;

    // SpO2
    private Integer avgSpo2;
    private Integer minSpo2;
    private Integer maxSpo2;
    private Integer latestSpo2;
    private String latestSpo2Time;
    private Integer spo2Count;
    private List<ChartPointDto> spo2Points;

    // Lịch sử đo đồng nhất (giữ nguyên không mất khi chuyển tab)
    private List<HealthRecordItemDto> hrHistory;
    private List<HealthRecordItemDto> spo2History;
}

