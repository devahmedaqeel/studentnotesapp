import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Camera } from 'expo-camera';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../hooks/useTheme';
import { CameraPreview } from '../components/scanner/CameraPreview';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';
import { imageService } from '../services/imageService';

type Props = NativeStackScreenProps<RootStackParamList, 'Scanner'>;

export const ScannerScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { subjectId, folderId } = route.params || {};

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [capturedPages, setCapturedPages] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleCapture = (uri: string) => {
    // Immediately open DocumentCropScreen after photo capture
    navigation.navigate('DocumentCropScreen', {
      imageUri: uri,
      pages: capturedPages,
      subjectId,
      folderId,
    });
  };

  const handleGalleryPick = async () => {
    try {
      const uris = await imageService.pickFromGallery(true);
      if (uris.length > 0) {
        // Open DocumentCropScreen for the first picked image
        const [firstUri, ...restUris] = uris;
        navigation.navigate('DocumentCropScreen', {
          imageUri: firstUri,
          pages: [...capturedPages, ...restUris],
          subjectId,
          folderId,
        });
      }
    } catch (err: any) {
      Alert.alert('Gallery Error', err.message || 'Could not import images.');
    }
  };

  if (hasPermission === null) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <LoadingState message="Checking camera permissions..." />
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <EmptyState
          title="Camera Access Required"
          description="StudentNotes needs camera permission to scan lecture notes and documents."
          icon="camera-outline"
          actionTitle="Import from Gallery"
          onAction={handleGalleryPick}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraPreview
        onCapture={handleCapture}
        onGalleryPick={handleGalleryPick}
        onClose={() => navigation.goBack()}
        capturedCount={capturedPages.length}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
});
