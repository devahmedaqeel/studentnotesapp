import { Camera } from 'expo-camera';

export const cameraService = {
  async requestPermissions(): Promise<boolean> {
    const { status } = await Camera.requestCameraPermissionsAsync();
    return status === 'granted';
  },

  async getPermissionStatus(): Promise<boolean> {
    const { status } = await Camera.getCameraPermissionsAsync();
    return status === 'granted';
  },
};
