import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Platform,
} from 'react-native';
import { Colors } from '../theme/colors';

interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  autoFocus?: boolean;
  disabled?: boolean;
  onComplete?: (value: string) => void;
}

export const OTPInput: React.FC<OTPInputProps> = ({
  value,
  onChange,
  length = 6,
  autoFocus = false,
  disabled = false,
  onComplete,
}) => {
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);

  const handleChangeText = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, length);
    onChange(cleaned);
    if (cleaned.length === length && onComplete) {
      onComplete(cleaned);
    }
  };

  return (
    <View style={styles.container}>
      {/* 6 Centered Digit Boxes (pointerEvents: 'none' để touch xuyên thẳng vào TextInput phía trên) */}
      <View style={[styles.boxesRow, { pointerEvents: 'none' as const }]}>
        {Array.from({ length }).map((_, index) => {
          const char = value[index] || '';
          const isCurrentBox = isFocused && value.length === index && !disabled;
          const isFilled = Boolean(char);
          const isMiddleSeparator = index === 2; // Khoảng cách giữa 3 số đầu và 3 số sau

          return (
            <React.Fragment key={index}>
              <View
                style={[
                  styles.box,
                  isFilled && styles.boxFilled,
                  isCurrentBox && styles.boxFocused,
                  disabled && styles.boxDisabled,
                ]}
              >
                <Text
                  style={[
                    styles.digitText,
                    isFilled && styles.digitTextFilled,
                    isCurrentBox && styles.digitTextFocused,
                  ]}
                >
                  {char || (isCurrentBox ? '|' : '')}
                </Text>
              </View>

              {isMiddleSeparator && <View style={styles.separator} />}
            </React.Fragment>
          );
        })}
      </View>

      {/* 
        Native TextInput phủ 100% diện tích ô nhập (Full Transparent Overlay):
        Người dùng chạm vào bất kỳ vị trí nào trong 6 ô đều là chạm trực tiếp vào TextInput,
        đảm bảo bàn phím Android luôn bật lên 100% ngay tức thì!
      */}
      <TextInput
        ref={inputRef}
        style={styles.fullOverlayInput}
        value={value}
        onChangeText={handleChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        maxLength={length}
        keyboardType="number-pad"
        autoFocus={autoFocus}
        editable={!disabled}
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        caretHidden={true}
        underlineColorAndroid="transparent"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    position: 'relative',
    marginVertical: 10,
    minHeight: 58,
  },
  boxesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 44,
    height: 54,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 3.5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  boxFilled: {
    borderColor: Colors.primary,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
  },
  boxFocused: {
    borderColor: Colors.primary,
    backgroundColor: '#EFF6FF',
    borderWidth: 2,
    transform: [{ scale: 1.04 }],
  },
  boxDisabled: {
    opacity: 0.6,
  },
  digitText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#94A3B8',
    textAlign: 'center',
  },
  digitTextFilled: {
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  digitTextFocused: {
    color: Colors.primary,
  },
  separator: {
    width: 10,
  },
  fullOverlayInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.01,
    color: 'transparent',
    backgroundColor: 'transparent',
  },
});
