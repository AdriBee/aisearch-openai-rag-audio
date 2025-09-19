import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';

interface StatusMessageProps {
  isRecording: boolean;
}

const StatusMessage: React.FC<StatusMessageProps> = ({ isRecording }) => {
  const { t } = useTranslation();
  const animatedValues = useRef([
    new Animated.Value(0.3),
    new Animated.Value(0.5),
    new Animated.Value(0.7),
    new Animated.Value(0.9),
  ]).current;

  useEffect(() => {
    if (isRecording) {
      const animations = animatedValues.map((animatedValue, index) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(animatedValue, {
              toValue: 1,
              duration: 600,
              useNativeDriver: false,
            }),
            Animated.timing(animatedValue, {
              toValue: 0.3,
              duration: 600,
              useNativeDriver: false,
            }),
          ]),
          { iterations: -1 }
        );
      });

      // Stagger the animations
      animations.forEach((animation, index) => {
        setTimeout(() => animation.start(), index * 100);
      });

      return () => {
        animations.forEach(animation => animation.stop());
      };
    } else {
      animatedValues.forEach(animatedValue => animatedValue.setValue(0.3));
    }
  }, [isRecording, animatedValues]);

  if (!isRecording) {
    return (
      <Text style={styles.notRecordingText}>
        {t('status.notRecordingMessage')}
      </Text>
    );
  }

  return (
    <View style={styles.recordingContainer}>
      <View style={styles.barsContainer}>
        {animatedValues.map((animatedValue, index) => (
          <Animated.View
            key={index}
            style={[
              styles.bar,
              {
                height: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: Platform.OS === 'web' ? [4, 16] : [8, 32],
                }),
                opacity: animatedValue,
              },
            ]}
          />
        ))}
      </View>
      <Text style={styles.recordingText}>
        {t('status.conversationInProgress')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  notRecordingText: {
    color: '#ffffff',
    fontSize: Platform.OS === 'web' ? 10 : 16,
    textAlign: 'center',
    marginTop: Platform.OS === 'web' ? 8 : 24,
    marginBottom: Platform.OS === 'web' ? 4 : 16,
  },
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Platform.OS === 'web' ? 8 : 24,
    marginBottom: Platform.OS === 'web' ? 4 : 16,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: Platform.OS === 'web' ? 16 : 32,
    width: Platform.OS === 'web' ? 16 : 32,
    justifyContent: 'space-around',
    marginRight: Platform.OS === 'web' ? 6 : 12,
  },
  bar: {
    width: Platform.OS === 'web' ? 2 : 4,
    backgroundColor: '#ffffff',
    borderRadius: Platform.OS === 'web' ? 1 : 2,
  },
  recordingText: {
    color: '#ffffff',
    fontSize: Platform.OS === 'web' ? 10 : 16,
  },
});

export default StatusMessage;
