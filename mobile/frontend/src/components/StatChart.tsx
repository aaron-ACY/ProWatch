import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  useWindowDimensions 
} from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { Colors } from '../theme/colors';

interface DataPoint {
  label: string;
  value: number;
}

interface StatChartProps {
  data: DataPoint[];
  color: string;
  unit: string;
  minVal?: number;
  maxVal?: number;
  avgVal?: number;
}

export const StatChart: React.FC<StatChartProps> = ({
  data,
  color,
  unit,
  minVal,
  maxVal,
  avgVal,
}) => {
  const { width: windowWidth } = useWindowDimensions();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Available width for chart
  const availableWidth = Math.max(windowWidth - 72, 280);

  // Health metric specific domain boundaries:
  // For SpO2: 94% -> 100% (span = 6, 3 sections of 2)
  // For Heart Rate: 50 -> 110 BPM (span = 60, 4 sections of 15)
  const isSpO2 = unit === '%';
  const computedMin = minVal !== undefined ? minVal : (isSpO2 ? 94 : 50);
  const computedMax = maxVal !== undefined ? maxVal : (isSpO2 ? 100 : 110);
  const chartSpan = Math.max(computedMax - computedMin, 6);
  const noOfSections = isSpO2 ? 3 : 4;
  const stepValue = chartSpan / noOfSections;

  // Bar sizing & spacing
  const barCount = Math.max(data.length, 1);
  const barWidth = barCount <= 7 ? 22 : 16;
  const spacing = Math.max((availableWidth - 50 - barCount * barWidth) / (barCount + 1), 12);

  // Gradient tones
  const isHr = color === Colors.heartRate;
  const gradientEndColor = isHr ? '#FCA5A5' : '#7DD3FC';

  // Selected item details
  const selectedItem = selectedIndex !== null && data[selectedIndex] ? data[selectedIndex] : null;

  // Format bar data with clamping (guarantees value >= 0 to avoid inverted/desync bugs)
  const formattedBarData = data.map((item, index) => {
    const isSelected = selectedIndex === index;
    const barVal = Math.max(0, Math.min(item.value - computedMin, chartSpan));
    return {
      value: barVal,
      label: item.label,
      frontColor: color,
      gradientColor: isSelected ? '#FFFFFF' : gradientEndColor,
      showGradient: true,
      topLabelComponent: () => (
        <Text style={[styles.barTopLabel, isSelected && { color, fontWeight: '800' }]}>
          {item.value}
        </Text>
      ),
      onPress: () => setSelectedIndex(index === selectedIndex ? null : index),
    };
  });

  // Average line position offset
  const avgOffsetPos = avgVal !== undefined 
    ? Math.max(0, Math.min(avgVal - computedMin, chartSpan)) 
    : undefined;

  // Unique key ensures clean remount on data / metric change to prevent cached animation state
  const chartKey = `bar-${color}-${computedMin}-${computedMax}-${data.map(d => `${d.label}_${d.value}`).join(',')}`;

  return (
    <View style={styles.container}>
      {/* Header controls: Selected item highlight banner */}
      <View style={styles.topControlRow}>
        <View style={styles.selectedBadgeContainer}>
          {selectedItem ? (
            <View style={[styles.selectedBadge, { borderColor: color }]}>
              <Text style={styles.selectedBadgeTime}>{selectedItem.label}:</Text>
              <Text style={[styles.selectedBadgeValue, { color }]}>
                {selectedItem.value} {unit}
              </Text>
            </View>
          ) : (
            <Text style={styles.chartTip}>Chạm vào cột để xem chi tiết</Text>
          )}
        </View>
      </View>

      {/* Chart Canvas */}
      <View style={styles.chartWrapper}>
        <BarChart
          key={chartKey}
          data={formattedBarData}
          barWidth={barWidth}
          spacing={spacing}
          initialSpacing={spacing / 2}
          endSpacing={spacing / 2}
          roundedTop
          roundedBottom
          barBorderRadius={8}
          isAnimated
          animationDuration={450}
          height={160}
          width={availableWidth - 30}
          maxValue={chartSpan}
          noOfSections={noOfSections}
          stepValue={stepValue}
          rulesType="dashed"
          rulesColor={Colors.border}
          rulesThickness={1}
          dashWidth={4}
          dashGap={4}
          yAxisThickness={0}
          xAxisThickness={1}
          xAxisColor={Colors.border}
          yAxisTextStyle={styles.axisLabel}
          xAxisLabelTextStyle={styles.axisLabel}
          formatYLabel={(val) => `${Math.round(Number(val)) + computedMin}`}
          yAxisLabelWidth={34}
          showReferenceLine1={avgOffsetPos !== undefined}
          referenceLine1Position={avgOffsetPos}
          referenceLine1Config={{
            color: color,
            dashWidth: 4,
            dashGap: 4,
            thickness: 1.5,
            type: 'dashed',
          }}
        />
      </View>

      {/* Average value tag legend */}
      {avgVal !== undefined && (
        <View style={styles.legendRow}>
          <View style={[styles.legendDash, { borderColor: color }]} />
          <Text style={styles.legendText}>
            Đường nét đứt: Mức trung bình ({avgVal} {unit})
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    alignItems: 'center',
    width: '100%',
  },
  topControlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  selectedBadgeContainer: {
    flex: 1,
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
    gap: 4,
  },
  selectedBadgeTime: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  selectedBadgeValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  chartTip: {
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  chartWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  barTopLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  axisLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  legendDash: {
    width: 16,
    height: 0,
    borderBottomWidth: 2,
    borderStyle: 'dashed',
  },
  legendText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});
