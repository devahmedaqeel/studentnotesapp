import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useTheme } from '../../hooks/useTheme';

const NUM_BARS = 18;
const MIN_BAR_HEIGHT = 4;
const MAX_BAR_HEIGHT = 28;

interface VoiceRecorderBarProps {
  onSendVoice: (audioUri: string, durationSeconds: number) => void;
  onCancel: () => void;
}

export const VoiceRecorderBar: React.FC<VoiceRecorderBarProps> = ({
  onSendVoice,
  onCancel,
}) => {
  const { isDark } = useTheme();
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [durationSec, setDurationSec] = useState(0);
  const timerRef = useRef<any>(null);
  const waveTimerRef = useRef<any>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const currentVolumeRef = useRef<number>(0.3);

  // 18 Animated values for dynamic audio sound wave lines
  const waveformAnims = useRef<Animated.Value[]>(
    Array.from({ length: NUM_BARS }, (_, i) => {
      const initialHeight = MIN_BAR_HEIGHT + (i % 4) * 2;
      return new Animated.Value(initialHeight);
    })
  ).current;

  useEffect(() => {
    startRecording();

    // Pulsing red recording dot animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.25,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Live audio waveform dynamic oscillation loop
    waveTimerRef.current = setInterval(() => {
      const vol = currentVolumeRef.current;
      const now = Date.now();

      waveformAnims.forEach((anim, i) => {
        // Compute harmonic wave heights responsive to live sound amplitude
        const waveFactor = (Math.sin(now / 140 + i * 0.55) + 1) / 2; // 0 to 1
        const centerFactor = 1 - Math.abs(i - (NUM_BARS - 1) / 2) / ((NUM_BARS - 1) / 2) * 0.35; // taller in middle
        const noise = (Math.random() * 0.3 + 0.7);

        const targetHeight = Math.min(
          MAX_BAR_HEIGHT,
          Math.max(
            MIN_BAR_HEIGHT,
            MIN_BAR_HEIGHT + (MAX_BAR_HEIGHT - MIN_BAR_HEIGHT) * vol * waveFactor * centerFactor * noise
          )
        );

        Animated.timing(anim, {
          toValue: targetHeight,
          duration: 75,
          useNativeDriver: false,
        }).start();
      });
    }, 80);

    return () => {
      stopAndCleanup();
    };
  }, []);

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Microphone Permission', 'Please allow microphone access to record voice notes.');
        onCancel();
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recordingOptions: Audio.RecordingOptions = {
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      };

      const { recording: newRecording } = await Audio.Recording.createAsync(
        recordingOptions,
        (status) => {
          if (status.isRecording && typeof status.metering === 'number') {
            // status.metering is in dB from -160 (silence) to 0 (peak)
            // Normalize typical speech range -50dB to -5dB into 0.15 .. 1.0
            const raw = status.metering;
            const normalized = Math.min(1.0, Math.max(0.15, (raw + 55) / 50));
            currentVolumeRef.current = normalized;
          }
        },
        75
      );

      setRecording(newRecording);
      setDurationSec(0);

      timerRef.current = setInterval(() => {
        setDurationSec((prev) => prev + 1);
      }, 1000);
    } catch (e) {
      console.warn('Failed to start recording:', e);
      onCancel();
    }
  };

  const stopAndCleanup = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (waveTimerRef.current) clearInterval(waveTimerRef.current);
    try {
      if (recording) {
        await recording.stopAndUnloadAsync();
      }
    } catch {}
  };

  const handleSend = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (waveTimerRef.current) clearInterval(waveTimerRef.current);
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (uri) {
        onSendVoice(uri, Math.max(1, durationSec));
      } else {
        onCancel();
      }
    } catch {
      onCancel();
    }
  };

  const handleCancel = async () => {
    await stopAndCleanup();
    onCancel();
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${String(s).padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {/* Pill Recording Bar */}
      <View
        style={[
          styles.pillBar,
          {
            backgroundColor: isDark ? '#1F2C34' : '#FFFFFF',
            borderColor: isDark ? '#2A3942' : '#E2E8F0',
          },
        ]}
      >
        {/* Pulsing Red Recording Dot */}
        <Animated.View style={[styles.redDot, { opacity: pulseAnim }]} />

        {/* Live Duration Timer */}
        <Text style={[styles.timerText, { color: isDark ? '#E9EDEF' : '#111B21' }]}>
          {formatTimer(durationSec)}
        </Text>

        {/* Live Audio Sound Waveform Bars */}
        <View style={styles.waveformContainer}>
          {waveformAnims.map((animVal, idx) => (
            <Animated.View
              key={idx}
              style={[
                styles.waveformBar,
                {
                  height: animVal,
                  backgroundColor: '#00A884',
                },
              ]}
            />
          ))}
        </View>

        {/* Trash / Cancel Button */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={handleCancel}
          style={styles.trashBtn}
        >
          <Ionicons name="trash-outline" size={22} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {/* WhatsApp Green Circular Send Button */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handleSend}
        style={[styles.greenSendBtn, { backgroundColor: '#00A884' }]}
      >
        <Ionicons name="send" size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 6,
    gap: 6,
  },
  pillBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 0.5,
    paddingHorizontal: 12,
    minHeight: 46,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  redDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    marginRight: 8,
  },
  timerText: {
    fontSize: 14.5,
    fontWeight: '800',
    minWidth: 38,
    fontVariant: ['tabular-nums'],
  },
  waveformContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 32,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  waveformBar: {
    width: 2.5,
    borderRadius: 1.5,
    marginHorizontal: 1.5,
  },
  trashBtn: {
    padding: 6,
    marginLeft: 4,
  },
  greenSendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});
