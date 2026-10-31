import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Svg, { Line, Rect, Circle } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Shadows } from '../theme/colors';
import { WatchFaceType } from '../types';
import { VaultBoySvg } from './VaultBoySvg';

interface WatchFacePreviewProps {
  faceType: WatchFaceType;
  bpm: number;
  spo2: number;
  battery: number;
}

export const WatchFacePreview: React.FC<WatchFacePreviewProps> = ({
  faceType,
  bpm,
  spo2,
  battery,
}) => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const dateStr = `${day}.${month}.${year}`;

  const renderFaceContent = () => {
    switch (faceType) {
      case 'health':
        return (
          <View style={styles.pipBoyFace}>
            {/* 1. TOP HEADER HUD: ┌──START──┐ HEART  DATA ───────┐ */}
            <View style={styles.pipHeaderContainer}>
              <Svg width="100%" height={20} viewBox="0 0 150 20">
                {/* Vạch thả góc trái */}
                <Line x1="4" y1="18" x2="4" y2="4" stroke="#00FF41" strokeWidth="2" />
                {/* Thanh ngang phía trên START */}
                <Line x1="4" y1="4" x2="48" y2="4" stroke="#00FF41" strokeWidth="2" />
                {/* Bậc thang hạ xuống giữa START và HEART */}
                <Line x1="48" y1="4" x2="48" y2="10" stroke="#00FF41" strokeWidth="2" />
                {/* Đường chạy ngang qua HEART và DATA */}
                <Line x1="48" y1="10" x2="146" y2="10" stroke="#00FF41" strokeWidth="2" />
                {/* Vạch thả góc phải */}
                <Line x1="146" y1="10" x2="146" y2="18" stroke="#00FF41" strokeWidth="2" />
              </Svg>

              <View style={styles.pipHeaderTextRow}>
                <Text style={styles.pipTextStart}>START</Text>
                <Text style={styles.pipTextHeart}>HEART</Text>
                <Text style={styles.pipTextData}>DATA</Text>
              </View>
            </View>

            {/* 2. NỘI DUNG CHÍNH (2 CỘT) */}
            <View style={styles.pipMainRow}>
              {/* CỘT TRÁI: Đồng hồ số xếp tầng & Khung Ngày tháng */}
              <View style={styles.pipColLeft}>
                {/* Khung số Giờ & Phút với ngoặc trên và ngoặc dưới */}
                <View style={styles.pipClockBracketBox}>
                  {/* Ngoặc góc trên */}
                  <View style={styles.bracketTopRow}>
                    <View style={styles.tickDown} />
                    <View style={styles.horizLine} />
                    <View style={styles.tickDown} />
                  </View>

                  {/* Số Giờ */}
                  <Text style={styles.pipClockNum}>{hours}</Text>

                  {/* Hai vạch ngang phân cách giờ và phút */}
                  <View style={styles.dashDividerRow}>
                    <View style={styles.dashLine} />
                    <View style={styles.dashLine} />
                  </View>

                  {/* Số Phút */}
                  <Text style={styles.pipClockNum}>{minutes}</Text>

                  {/* Ngoặc góc dưới */}
                  <View style={styles.bracketBottomRow}>
                    <View style={styles.tickUp} />
                    <View style={styles.horizLine} />
                    <View style={styles.tickUp} />
                  </View>
                </View>

                {/* Khung Ngày tháng: ┌ 26.05.2025 ┐ */}
                <View style={styles.pipDateBracketBox}>
                  <View style={styles.bracketTopRow}>
                    <View style={styles.miniTickDown} />
                    <View style={styles.miniHorizLine} />
                    <View style={styles.miniTickDown} />
                  </View>
                  <Text style={styles.pipDateString}>{dateStr}</Text>
                  <View style={styles.bracketBottomRow}>
                    <View style={styles.miniTickUp} />
                    <View style={styles.miniHorizLine} />
                    <View style={styles.miniTickUp} />
                  </View>
                </View>
              </View>

              {/* CỘT PHẢI: Thanh SpO2, Mascot Vault Boy bước đi, Khung HP */}
              <View style={styles.pipColRight}>
                {/* Thanh SpO2 và chỉ số SP02: 100% */}
                <View style={styles.pipSpO2Container}>
                  <View style={styles.pipSpO2BarWrapper}>
                    <View
                      style={[
                        styles.pipSpO2BarFill,
                        { width: `${Math.min(100, Math.max(30, spo2 || 100))}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.pipSpO2Text}>SP02: {spo2 || 100}%</Text>
                </View>

                {/* Vault Boy - Mascot Fallout Pip-Boy đích thực */}
                <View style={styles.pipVaultBoyCenter}>
                  <VaultBoySvg size={52} color="#00FF41" />
                </View>

                {/* Khung HP: ┌ HP 100 ┐ */}
                <View style={styles.pipHpBracketBox}>
                  <View style={styles.bracketTopRow}>
                    <View style={styles.miniTickDown} />
                    <View style={styles.miniHorizLine} />
                    <View style={styles.miniTickDown} />
                  </View>
                  <Text style={styles.pipHpString}>HP {bpm || 100}</Text>
                  <View style={styles.bracketBottomRow}>
                    <View style={styles.miniTickUp} />
                    <View style={styles.miniHorizLine} />
                    <View style={styles.miniTickUp} />
                  </View>
                </View>
              </View>
            </View>
          </View>
        );

      case 'sport':
        return (
          <View style={styles.sportFace}>
            <Text style={styles.sportTag}>SPORT ACTIVE</Text>
            <Text style={styles.sportTime}>{`${hours}:${minutes}`}</Text>
            <View style={styles.sportStats}>
              <Text style={styles.sportStatItem}>❤️ {bpm || 78} BPM</Text>
              <Text style={styles.sportStatItem}>🔥 385 KCAL</Text>
              <Text style={styles.sportStatItem}>⚡ {battery}% BAT</Text>
            </View>
          </View>
        );

      case 'cyber':
        return (
          <View style={styles.cyberFace}>
            <Text style={styles.cyberHeader}>SYS // 2026</Text>
            <Text style={styles.cyberTime}>{`${hours}:${minutes}`}</Text>
            <Text style={styles.cyberData}>HR:{bpm || 78} | O2:{spo2}% | BAT:{battery}%</Text>
          </View>
        );

      case 'minimal':
      default:
        return (
          <View style={styles.minimalFace}>
            <Text style={styles.minimalTime}>{`${hours}:${minutes}`}</Text>
            <Text style={styles.minimalDate}>{dateStr}</Text>
            <View style={styles.minimalHeart}>
              <MaterialCommunityIcons name="heart" size={12} color={Colors.heartRate} />
              <Text style={styles.minimalBpm}>{bpm || 75} BPM</Text>
            </View>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      {/* VỎ ĐỒNG HỒ DIY CYBERPUNK (Mô phỏng 100% board mạch và thanh đồng từ ảnh thực tế) */}
      <View style={styles.watchModuleOuter}>
        {/* Dây đeo da đen phía trên */}
        <View style={styles.strapLeatherTop} />

        {/* Thanh quai đồng uốn trên kèm mối hàn vàng */}
        <View style={styles.brassRailTop}>
          <View style={styles.solderPadLeft} />
          <View style={styles.brassWireBar} />
          <View style={styles.solderPadRight} />
        </View>

        {/* Bo mạch PCB màu Teal đậm công nghiệp */}
        <View style={styles.pcbBoard}>
          {/* Màn hình hiển thị LCD dọc */}
          <View style={styles.lcdScreenBezel}>
            <View style={styles.lcdInnerDisplay}>{renderFaceContent()}</View>
          </View>

          {/* Dải chân cáp màn hình Flex mạ vàng */}
          <View style={styles.flexPinsRow}>
            {Array.from({ length: 18 }).map((_, i) => (
              <View key={i} style={styles.goldPinDot} />
            ))}
          </View>

          {/* 4 Bu-lông lục giác bằng đồng thau dọc cạnh dưới PCB */}
          <View style={styles.brassBoltsRow}>
            {Array.from({ length: 4 }).map((_, i) => (
              <View key={i} style={styles.hexBoltHead}>
                <View style={styles.hexBoltInnerRing}>
                  <View style={styles.hexBoltCenterHole} />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Thanh quai đồng uốn dưới kèm mối hàn vàng */}
        <View style={styles.brassRailBottom}>
          <View style={styles.solderPadLeft} />
          <View style={styles.brassWireBar} />
          <View style={styles.solderPadRight} />
        </View>

        {/* Dây đeo da đen phía dưới */}
        <View style={styles.strapLeatherBottom} />
      </View>

      <Text style={styles.faceName}>
        {faceType === 'health'
          ? 'Mặt đồng hồ: PIP-BOY TERMINAL'
          : `Mặt đồng hồ: ${faceType.toUpperCase()}`}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 10,
  },

  // =========================================================================
  // VỎ PHẦN CỨNG DIY (Khớp chuẩn 100% với ảnh chụp thực tế trên tay)
  // =========================================================================
  watchModuleOuter: {
    alignItems: 'center',
    position: 'relative',
    paddingVertical: 12,
  },
  strapLeatherTop: {
    position: 'absolute',
    top: 0,
    width: 90,
    height: 18,
    backgroundColor: '#1C1917',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderWidth: 1,
    borderColor: '#292524',
  },
  strapLeatherBottom: {
    position: 'absolute',
    bottom: 0,
    width: 90,
    height: 18,
    backgroundColor: '#1C1917',
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    borderWidth: 1,
    borderColor: '#292524',
  },

  // Thanh quai đồng uốn
  brassRailTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 156,
    height: 12,
    zIndex: 10,
    marginBottom: -4,
  },
  brassRailBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 156,
    height: 12,
    zIndex: 10,
    marginTop: -4,
  },
  brassWireBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#C59A45',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#8E6B1D',
    marginHorizontal: 4,
    ...Shadows.sm,
  },
  solderPadLeft: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#D4AF37',
    borderWidth: 1.5,
    borderColor: '#785A14',
  },
  solderPadRight: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#D4AF37',
    borderWidth: 1.5,
    borderColor: '#785A14',
  },

  // Bo mạch PCB màu Teal đậm
  pcbBoard: {
    backgroundColor: '#0A3B49', // Nền bo mạch teal đậm của Seeed XIAO ESP32-S3
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#115263',
    alignItems: 'center',
    ...Shadows.md,
  },

  // Viền màn hình LCD
  lcdScreenBezel: {
    width: 158,
    height: 200,
    backgroundColor: '#000000',
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#020617',
    padding: 3,
  },
  lcdInnerDisplay: {
    flex: 1,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },

  // Dải chân cáp flex mạ vàng
  flexPinsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 130,
    height: 5,
    marginTop: 4,
  },
  goldPinDot: {
    width: 2,
    height: 3,
    backgroundColor: '#D4AF37',
    borderRadius: 0.5,
  },

  // 4 bu-lông lục giác đồng thau
  brassBoltsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: 140,
    marginTop: 6,
    marginBottom: 2,
  },
  hexBoltHead: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#C59A45',
    borderWidth: 1,
    borderColor: '#785A14',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  hexBoltInnerRing: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#9A7426',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hexBoltCenterHole: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#1E293B',
  },

  faceName: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },

  // =========================================================================
  // GIAO DIỆN PIP-BOY TERMINAL
  // =========================================================================
  pipBoyFace: {
    flex: 1,
    backgroundColor: '#000000',
    paddingHorizontal: 5,
    paddingTop: 3,
    paddingBottom: 4,
    justifyContent: 'space-between',
  },

  // 1. Header HUD
  pipHeaderContainer: {
    width: '100%',
    height: 22,
    position: 'relative',
  },
  pipHeaderTextRow: {
    position: 'absolute',
    top: 5,
    left: 8,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pipTextStart: {
    fontSize: 9,
    fontFamily: Platform.OS === 'ios' ? 'Courier-Bold' : 'monospace',
    fontWeight: '900',
    color: '#00FF41',
    letterSpacing: 0.5,
    width: 42,
  },
  pipTextHeart: {
    fontSize: 9,
    fontFamily: Platform.OS === 'ios' ? 'Courier-Bold' : 'monospace',
    fontWeight: '900',
    color: '#00FF41',
    letterSpacing: 0.5,
    marginLeft: 6,
  },
  pipTextData: {
    fontSize: 9,
    fontFamily: Platform.OS === 'ios' ? 'Courier-Bold' : 'monospace',
    fontWeight: '900',
    color: '#00FF41',
    letterSpacing: 0.5,
    marginLeft: 12,
  },

  // 2. Nội dung chính 2 cột
  pipMainRow: {
    flex: 1,
    flexDirection: 'row',
    marginTop: 1,
    justifyContent: 'space-between',
  },

  // Cột trái
  pipColLeft: {
    width: 66,
    justifyContent: 'space-between',
  },
  pipClockBracketBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 1,
  },
  bracketTopRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bracketBottomRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  horizLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#00FF41',
  },
  tickDown: {
    width: 2,
    height: 7,
    backgroundColor: '#00FF41',
  },
  tickUp: {
    width: 2,
    height: 7,
    backgroundColor: '#00FF41',
  },
  pipClockNum: {
    fontSize: 38,
    fontFamily: Platform.OS === 'ios' ? 'Courier-Bold' : 'monospace',
    fontWeight: '900',
    color: '#00FF41',
    lineHeight: 40,
    letterSpacing: -1,
  },
  dashDividerRow: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: 1,
  },
  dashLine: {
    width: 8,
    height: 2.5,
    backgroundColor: '#00FF41',
    borderRadius: 1,
  },

  // Khung Ngày tháng
  pipDateBracketBox: {
    width: '100%',
    marginTop: 4,
    alignItems: 'center',
  },
  miniHorizLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: '#00FF41',
  },
  miniTickDown: {
    width: 1.5,
    height: 4,
    backgroundColor: '#00FF41',
  },
  miniTickUp: {
    width: 1.5,
    height: 4,
    backgroundColor: '#00FF41',
  },
  pipDateString: {
    fontSize: 7.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier-Bold' : 'monospace',
    fontWeight: '900',
    color: '#00FF41',
    letterSpacing: 0.2,
    marginVertical: 1.5,
  },

  // Cột phải
  pipColRight: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 6,
  },
  pipSpO2Container: {
    width: '100%',
    alignItems: 'flex-start',
    marginTop: 2,
  },
  pipSpO2BarWrapper: {
    width: '92%',
    height: 5.5,
    backgroundColor: 'rgba(0, 255, 65, 0.2)',
    overflow: 'hidden',
  },
  pipSpO2BarFill: {
    height: '100%',
    backgroundColor: '#00FF41',
  },
  pipSpO2Text: {
    fontSize: 7.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier-Bold' : 'monospace',
    fontWeight: '900',
    color: '#00FF41',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  pipVaultBoyCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 1,
  },

  // Khung HP
  pipHpBracketBox: {
    width: '88%',
    marginTop: 4,
    alignItems: 'center',
  },
  pipHpString: {
    fontSize: 8.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier-Bold' : 'monospace',
    fontWeight: '900',
    color: '#00FF41',
    letterSpacing: 0.5,
    marginVertical: 1.5,
  },

  // Các theme khác giữ nguyên
  sportFace: {
    flex: 1,
    backgroundColor: '#0F172A',
    padding: 10,
    justifyContent: 'space-between',
  },
  sportTag: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.warning,
    letterSpacing: 1,
  },
  sportTime: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.white,
    textAlign: 'center',
    marginVertical: 8,
  },
  sportStats: {
    gap: 4,
  },
  sportStatItem: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
  cyberFace: {
    flex: 1,
    backgroundColor: '#090D16',
    padding: 10,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  cyberHeader: {
    fontSize: 9,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 1.5,
  },
  cyberTime: {
    fontSize: 26,
    fontWeight: '900',
    color: '#38BDF8',
    textAlign: 'center',
    marginVertical: 8,
  },
  cyberData: {
    fontSize: 8,
    fontWeight: '700',
    color: '#0EA5E9',
    textAlign: 'center',
  },
  minimalFace: {
    flex: 1,
    backgroundColor: '#1E293B',
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minimalTime: {
    fontSize: 30,
    fontWeight: '300',
    color: Colors.white,
    letterSpacing: 1,
  },
  minimalDate: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
  },
  minimalHeart: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 4,
  },
  minimalBpm: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.heartRate,
  },
});
