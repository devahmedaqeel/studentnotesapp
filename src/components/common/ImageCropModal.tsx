import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  PanResponder,
  LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImageManipulator from 'expo-image-manipulator';
import Svg, { Polygon, Line, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { getDisplayedImageBounds } from '../../utils/cropUtils';

export interface ImageCropModalProps {
  visible: boolean;
  imageUri: string | null;
  originalUri?: string | null;
  onCropComplete: (croppedUri: string) => void;
  onRevertOriginal?: () => void;
  onCancel: () => void;
}

interface Point {
  x: number; // percentage (0 to 100)
  y: number; // percentage (0 to 100)
}

interface QuadCorners {
  tl: Point;
  tr: Point;
  br: Point;
  bl: Point;
}

const DEFAULT_CORNERS: QuadCorners = {
  tl: { x: 5, y: 5 },
  tr: { x: 95, y: 5 },
  br: { x: 95, y: 95 },
  bl: { x: 5, y: 95 },
};

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  visible,
  imageUri,
  originalUri,
  onCropComplete,
  onRevertOriginal,
  onCancel,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [naturalWidth, setNaturalWidth] = useState(1200);
  const [naturalHeight, setNaturalHeight] = useState(1600);
  const [rotation, setRotation] = useState(0);

  const [corners, setCorners] = useState<QuadCorners>(DEFAULT_CORNERS);
  const [containerSize, setContainerSize] = useState({ width: 300, height: 400 });
  const [processing, setProcessing] = useState(false);

  const startCornerRef = useRef<Point>({ x: 0, y: 0 });
  const activeSourceUri = originalUri || imageUri;

  useEffect(() => {
    if (activeSourceUri && visible) {
      Image.getSize(
        activeSourceUri,
        (w, h) => {
          if (w > 0 && h > 0) {
            setNaturalWidth(w);
            setNaturalHeight(h);
          }
        },
        () => {
          setNaturalWidth(1200);
          setNaturalHeight(1600);
        }
      );
      setCorners(DEFAULT_CORNERS);
      setRotation(0);
    }
  }, [activeSourceUri, visible]);

  const handleCanvasLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setContainerSize({ width, height });
    }
  };

  const getDisplayedBounds = () => {
    return getDisplayedImageBounds({
      containerW: containerSize.width,
      containerH: containerSize.height,
      naturalW: naturalWidth,
      naturalH: naturalHeight,
    });
  };

  const bounds = getDisplayedBounds();

  // Keep a ref to bounds so PanResponder closures always read the latest value
  const boundsRef = useRef(bounds);
  boundsRef.current = bounds;

  // Ref tracking start corners position during drag gestures
  const startQuadRef = useRef<QuadCorners>(DEFAULT_CORNERS);

  const createCornerResponder = (cornerKey: keyof QuadCorners) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {
        startQuadRef.current = JSON.parse(JSON.stringify(corners));
      },
      onPanResponderMove: (_, gestureState) => {
        const { dx, dy } = gestureState;
        const currentBounds = boundsRef.current;
        const actualW = Math.max(10, currentBounds.actualW);
        const actualH = Math.max(10, currentBounds.actualH);

        const deltaPctX = (dx / actualW) * 100;
        const deltaPctY = (dy / actualH) * 100;

        const start = startQuadRef.current;
        const startPoint = start[cornerKey];

        const rawX = Math.max(0, Math.min(100, startPoint.x + deltaPctX));
        const rawY = Math.max(0, Math.min(100, startPoint.y + deltaPctY));

        setCorners((prev) => {
          let updatedX = rawX;
          let updatedY = rawY;

          if (cornerKey === 'tl') {
            updatedX = Math.max(0, Math.min(prev.tr.x - 3, rawX));
            updatedY = Math.max(0, Math.min(prev.bl.y - 3, rawY));
          } else if (cornerKey === 'tr') {
            updatedX = Math.max(prev.tl.x + 3, Math.min(100, rawX));
            updatedY = Math.max(0, Math.min(prev.br.y - 3, rawY));
          } else if (cornerKey === 'br') {
            updatedX = Math.max(prev.bl.x + 3, Math.min(100, rawX));
            updatedY = Math.max(prev.tr.y + 3, Math.min(100, rawY));
          } else if (cornerKey === 'bl') {
            updatedX = Math.max(0, Math.min(prev.br.x - 3, rawX));
            updatedY = Math.max(prev.tl.y + 3, Math.min(100, rawY));
          }

          return {
            ...prev,
            [cornerKey]: { x: updatedX, y: updatedY },
          };
        });
      },
    });

  const panTL = useRef(createCornerResponder('tl')).current;
  const panTR = useRef(createCornerResponder('tr')).current;
  const panBR = useRef(createCornerResponder('br')).current;
  const panBL = useRef(createCornerResponder('bl')).current;

  // 2. Edge Line Drag Responders (Moves side edge line smoothly with finger touch)
  const createEdgeResponder = (edge: 'top' | 'bottom' | 'left' | 'right') =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {
        startQuadRef.current = JSON.parse(JSON.stringify(corners));
      },
      onPanResponderMove: (_, gestureState) => {
        const { dx, dy } = gestureState;
        const currentBounds = boundsRef.current;
        const actualW = Math.max(10, currentBounds.actualW);
        const actualH = Math.max(10, currentBounds.actualH);

        const deltaPctX = (dx / actualW) * 100;
        const deltaPctY = (dy / actualH) * 100;

        const start = startQuadRef.current;

        setCorners((prev) => {
          if (edge === 'top') {
            const newY = Math.max(0, Math.min(start.bl.y - 3, start.tl.y + deltaPctY));
            return {
              ...prev,
              tl: { ...prev.tl, y: newY },
              tr: { ...prev.tr, y: newY },
            };
          } else if (edge === 'bottom') {
            const newY = Math.max(start.tl.y + 3, Math.min(100, start.bl.y + deltaPctY));
            return {
              ...prev,
              bl: { ...prev.bl, y: newY },
              br: { ...prev.br, y: newY },
            };
          } else if (edge === 'left') {
            const newX = Math.max(0, Math.min(start.tr.x - 3, start.tl.x + deltaPctX));
            return {
              ...prev,
              tl: { ...prev.tl, x: newX },
              bl: { ...prev.bl, x: newX },
            };
          } else if (edge === 'right') {
            const newX = Math.max(start.tl.x + 3, Math.min(100, start.tr.x + deltaPctX));
            return {
              ...prev,
              tr: { ...prev.tr, x: newX },
              br: { ...prev.br, x: newX },
            };
          }
          return prev;
        });
      },
    });

  const panEdgeTop = useRef(createEdgeResponder('top')).current;
  const panEdgeBottom = useRef(createEdgeResponder('bottom')).current;
  const panEdgeLeft = useRef(createEdgeResponder('left')).current;
  const panEdgeRight = useRef(createEdgeResponder('right')).current;

  if (!visible || !activeSourceUri) return null;

  const handleAutoDetect = () => {
    setCorners({
      tl: { x: 6, y: 6 },
      tr: { x: 94, y: 6 },
      br: { x: 94, y: 94 },
      bl: { x: 6, y: 94 },
    });
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleResetCrop = () => {
    setCorners({
      tl: { x: 0, y: 0 },
      tr: { x: 100, y: 0 },
      br: { x: 100, y: 100 },
      bl: { x: 0, y: 100 },
    });
    setRotation(0);
    if (onRevertOriginal) {
      onRevertOriginal();
    }
  };

  const handleExecuteCrop = async () => {
    try {
      setProcessing(true);

      const actions: ImageManipulator.Action[] = [];

      // 1. Calculate pixel coordinates directly on natural image dimensions
      const minPctX = Math.min(corners.tl.x, corners.bl.x);
      const maxPctX = Math.max(corners.tr.x, corners.br.x);
      const minPctY = Math.min(corners.tl.y, corners.tr.y);
      const maxPctY = Math.max(corners.bl.y, corners.br.y);

      const originX = Math.max(0, Math.round((minPctX / 100) * naturalWidth));
      const originY = Math.max(0, Math.round((minPctY / 100) * naturalHeight));
      const maxX = Math.min(naturalWidth, Math.round((maxPctX / 100) * naturalWidth));
      const maxY = Math.min(naturalHeight, Math.round((maxPctY / 100) * naturalHeight));

      const cropW = Math.max(50, maxX - originX);
      const cropH = Math.max(50, maxY - originY);

      // Add high-resolution crop action FIRST
      actions.push({
        crop: {
          originX,
          originY,
          width: cropW,
          height: cropH,
        },
      });

      // 2. Rotate orientation AFTER crop if requested
      if (rotation !== 0) {
        actions.push({ rotate: rotation });
      }

      const result = await ImageManipulator.manipulateAsync(activeSourceUri, actions, {
        compress: 0.95,
        format: ImageManipulator.SaveFormat.JPEG,
      });

      setProcessing(false);
      onCropComplete(result.uri);
    } catch (err) {
      setProcessing(false);
      console.error('Crop error:', err);
    }
  };

  const actualW = bounds.actualW;
  const actualH = bounds.actualH;

  const tlScreen = { x: (corners.tl.x / 100) * actualW, y: (corners.tl.y / 100) * actualH };
  const trScreen = { x: (corners.tr.x / 100) * actualW, y: (corners.tr.y / 100) * actualH };
  const brScreen = { x: (corners.br.x / 100) * actualW, y: (corners.br.y / 100) * actualH };
  const blScreen = { x: (corners.bl.x / 100) * actualW, y: (corners.bl.y / 100) * actualH };

  const polyPoints = `${tlScreen.x},${tlScreen.y} ${trScreen.x},${trScreen.y} ${brScreen.x},${brScreen.y} ${blScreen.x},${blScreen.y}`;
  const maskPathD = `M0,0 L${actualW},0 L${actualW},${actualH} L0,${actualH} Z M${tlScreen.x},${tlScreen.y} L${trScreen.x},${trScreen.y} L${brScreen.x},${brScreen.y} L${blScreen.x},${blScreen.y} Z`;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onCancel}>
      <View style={[styles.container, { backgroundColor: '#0A0A0A' }]}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 8 }]}>
          <TouchableOpacity onPress={onCancel} style={styles.headerBtn}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Document Scanner Crop</Text>
          <TouchableOpacity
            onPress={handleExecuteCrop}
            disabled={processing}
            style={[styles.applyBadge, { backgroundColor: theme.colors.primary }]}
          >
            {processing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                <Text style={styles.applyText}>Crop & Save</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.canvasContainer} onLayout={handleCanvasLayout}>
          <View
            style={[
              styles.imageWrapper,
              {
                width: bounds.actualW,
                height: bounds.actualH,
                transform: [{ rotate: `${rotation}deg` }],
              },
            ]}
          >
            <Image source={{ uri: activeSourceUri }} style={styles.previewImage} resizeMode="contain" />

            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <Svg width={actualW} height={actualH}>
                <Path d={maskPathD} fill="rgba(0, 0, 0, 0.62)" fillRule="evenodd" />
                <Polygon points={polyPoints} fill="rgba(59, 130, 246, 0.16)" />
                <Line x1={tlScreen.x} y1={tlScreen.y} x2={trScreen.x} y2={trScreen.y} stroke="#FFFFFF" strokeWidth={2.5} />
                <Line x1={trScreen.x} y1={trScreen.y} x2={brScreen.x} y2={brScreen.y} stroke="#FFFFFF" strokeWidth={2.5} />
                <Line x1={brScreen.x} y1={brScreen.y} x2={blScreen.x} y2={blScreen.y} stroke="#FFFFFF" strokeWidth={2.5} />
                <Line x1={blScreen.x} y1={blScreen.y} x2={tlScreen.x} y2={tlScreen.y} stroke="#FFFFFF" strokeWidth={2.5} />
              </Svg>
            </View>

            <View {...panTL.panHandlers} style={[styles.cornerHandleTouch, { left: tlScreen.x - 30, top: tlScreen.y - 30 }]}>
              <View style={styles.cornerCircleOuter}>
                <View style={styles.cornerCircleInner} />
              </View>
            </View>

            <View {...panTR.panHandlers} style={[styles.cornerHandleTouch, { left: trScreen.x - 30, top: trScreen.y - 30 }]}>
              <View style={styles.cornerCircleOuter}>
                <View style={styles.cornerCircleInner} />
              </View>
            </View>

            <View {...panBR.panHandlers} style={[styles.cornerHandleTouch, { left: brScreen.x - 30, top: brScreen.y - 30 }]}>
              <View style={styles.cornerCircleOuter}>
                <View style={styles.cornerCircleInner} />
              </View>
            </View>

            <View {...panBL.panHandlers} style={[styles.cornerHandleTouch, { left: blScreen.x - 30, top: blScreen.y - 30 }]}>
              <View style={styles.cornerCircleOuter}>
                <View style={styles.cornerCircleInner} />
              </View>
            </View>

            {/* ===== 4 SIDE EDGE LINE DRAG HANDLES ===== */}
            <View
              {...panEdgeTop.panHandlers}
              style={[styles.edgeHandleTouch, { left: ((tlScreen.x + trScreen.x) / 2) - 30, top: ((tlScreen.y + trScreen.y) / 2) - 25 }]}
            >
              <View style={styles.edgeBarH} />
            </View>

            <View
              {...panEdgeBottom.panHandlers}
              style={[styles.edgeHandleTouch, { left: ((blScreen.x + brScreen.x) / 2) - 30, top: ((blScreen.y + brScreen.y) / 2) - 25 }]}
            >
              <View style={styles.edgeBarH} />
            </View>

            <View
              {...panEdgeLeft.panHandlers}
              style={[styles.edgeHandleTouch, { left: ((tlScreen.x + blScreen.x) / 2) - 25, top: ((tlScreen.y + blScreen.y) / 2) - 30 }]}
            >
              <View style={styles.edgeBarV} />
            </View>

            <View
              {...panEdgeRight.panHandlers}
              style={[styles.edgeHandleTouch, { left: ((trScreen.x + brScreen.x) / 2) - 25, top: ((trScreen.y + brScreen.y) / 2) - 30 }]}
            >
              <View style={styles.edgeBarV} />
            </View>
          </View>
        </View>

        <View style={[styles.controlsCard, { backgroundColor: '#141414', paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Ionicons name="close-circle-outline" size={16} color="#9CA3AF" />
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.autoBtn} onPress={handleAutoDetect}>
              <Ionicons name="scan-outline" size={16} color="#60A5FA" />
              <Text style={styles.autoText}>Auto Detect</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.revertBtn} onPress={handleResetCrop}>
              <Ionicons name="refresh-outline" size={16} color="#EF4444" />
              <Text style={styles.revertText}>Reset</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.rotateBtn} onPress={handleRotate}>
              <Ionicons name="reload" size={16} color="#FFFFFF" />
              <Text style={styles.rotateText}>Rotate 90°</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#141414',
  },
  headerBtn: { padding: 4 },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  applyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
  },
  applyText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 4,
  },
  canvasContainer: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 2,
  },
  cornerHandleTouch: {
    position: 'absolute',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    elevation: 10,
  },
  cornerCircleOuter: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#3B82F6',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 6,
  },
  cornerCircleInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },

  /* 4 Side Edge Line Touch Handles */
  edgeHandleTouch: {
    position: 'absolute',
    width: 60,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9998,
    elevation: 9,
  },
  edgeBarH: {
    width: 36,
    height: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    opacity: 0.9,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
    elevation: 4,
  },
  edgeBarV: {
    width: 4,
    height: 36,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    opacity: 0.9,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
    elevation: 4,
  },
  controlsCard: {
    paddingHorizontal: 14,
    paddingTop: 12,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 8,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 6,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  cancelText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  autoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: 'rgba(96, 165, 250, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.3)',
  },
  autoText: {
    color: '#60A5FA',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  revertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  revertText: {
    color: '#F87171',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  rotateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  rotateText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
});
