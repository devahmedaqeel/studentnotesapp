import React, { useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { CameraView, CameraType, FlashMode } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

export interface CameraPreviewProps {
  onCapture: (uri: string) => void;
  onGalleryPick: () => void;
  onClose: () => void;
  capturedCount: number;
}

export const CameraPreview: React.FC<CameraPreviewProps> = ({
  onCapture,
  onGalleryPick,
  onClose,
  capturedCount,
}) => {
  const cameraRef = useRef<any>(null);
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [capturing, setCapturing] = useState(false);

  const toggleFacing = () => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  const toggleFlash = () => {
    setFlash((current) => (current === 'off' ? 'on' : 'off'));
  };

  const handleTakePicture = async () => {
    if (!cameraRef.current || capturing) return;
    try {
      setCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      });
      if (photo?.uri) {
        onCapture(photo.uri);
      }
    } catch (err) {
      console.error('Camera capture error:', err);
    } finally {
      setCapturing(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        flash={flash}
      >
        {/* Top Controls Overlay */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.topRight}>
            <TouchableOpacity onPress={toggleFlash} style={styles.iconBtn}>
              <Ionicons
                name={flash === 'on' ? 'flash' : 'flash-off'}
                size={24}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={toggleFacing} style={styles.iconBtn}>
              <Ionicons name="camera-reverse-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Center Target Frame */}
        <View style={styles.centerTarget}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRightCorner]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>

        {/* Bottom Bar Controls */}
        <View style={styles.bottomBar}>
          <TouchableOpacity onPress={onGalleryPick} style={styles.iconBtn}>
            <Ionicons name="images-outline" size={28} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleTakePicture}
            disabled={capturing}
            style={styles.captureRing}
          >
            <View style={styles.captureInner} />
          </TouchableOpacity>

          <View style={styles.badgeContainer}>
            {capturedCount > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{capturedCount}</Text>
              </View>
            )}
          </View>
        </View>
      </CameraView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  camera: { flex: 1, justifyContent: 'space-between' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingHorizontal: 20,
  },
  topRight: { flexDirection: 'row', gap: 16 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerTarget: {
    alignSelf: 'center',
    width: '82%',
    aspectRatio: 0.72,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 12,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#4F46E5',
  },
  topLeft: { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 8 },
  topRightCorner: { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 8 },
  bottomLeft: { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 8 },
  bottomRight: { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 8 },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  captureRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
  },
  badgeContainer: { width: 44, alignItems: 'center' },
  countBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
