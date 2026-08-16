import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../hooks/useTheme';
import { AppHeader } from '../components/common/AppHeader';
import { LoadingState } from '../components/common/LoadingState';
import { BottomSheet } from '../components/common/BottomSheet';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Ionicons } from '@expo/vector-icons';
import { pdfRepository } from '../database/repositories/pdfRepository';
import { documentRepository } from '../database/repositories/documentRepository';
import { trashRepository } from '../database/repositories/trashRepository';
import { shareService } from '../services/shareService';
import { fileService } from '../services/fileService';
import { storageService } from '../services/storageService';
import { PdfDocument } from '../types/pdf';
import { formatPageCount } from '../utils/formatting';

type Props = NativeStackScreenProps<RootStackParamList, 'PdfViewer'>;

export const PdfViewerScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { pdfId, filePath: customFilePath, title: customTitle } = route.params;
  const webViewRef = useRef<WebView>(null);

  const [pdf, setPdf] = useState<PdfDocument | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(pdf?.pageCount || 1);
  const [showOptions, setShowOptions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fetchPdf = async () => {
    try {
      let data = await pdfRepository.getById(pdfId);
      let targetPath = data?.filePath || customFilePath;

      if (!data) {
        // Check document vault repository
        const vaultDoc = await documentRepository.getById(pdfId);
        if (vaultDoc) {
          data = {
            id: vaultDoc.id,
            subjectId: '',
            title: vaultDoc.title,
            filePath: vaultDoc.filePath,
            pageCount: 1,
            favorite: vaultDoc.favorite,
            createdAt: vaultDoc.createdAt,
            updatedAt: vaultDoc.updatedAt,
          };
          targetPath = vaultDoc.filePath;
        } else if (customFilePath) {
          data = {
            id: pdfId,
            subjectId: '',
            title: customTitle || 'Document Preview',
            filePath: customFilePath,
            pageCount: 1,
            favorite: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
        }
      }

      setPdf(data);
      if (data?.pageCount) {
        setTotalPages(data.pageCount);
      }

      if (targetPath) {
        try {
          let resolvedLocalPath = targetPath;
          let fileExists = false;

          const isRemoteUrl = targetPath.startsWith('http://') || targetPath.startsWith('https://');

          // Check if local file exists
          if (!isRemoteUrl) {
            const check = await FileSystem.getInfoAsync(targetPath);
            fileExists = check.exists;
          } else {
            fileExists = true;
          }

          // If local file doesn't exist, download from cloud storage
          if (!fileExists) {
            const downloaded = await storageService.downloadPdfToLocal(targetPath);
            if (downloaded) {
              resolvedLocalPath = downloaded;
              fileExists = true;
            }
          }

          if (fileExists) {
            const b64 = await FileSystem.readAsStringAsync(resolvedLocalPath, { encoding: 'base64' as any });
            setPdfBase64(b64.replace(/[\r\n\s]/g, ''));
          }
        } catch (e) {
          console.warn('Failed to read PDF base64:', e);
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load PDF.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPdf();
  }, [pdfId]);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'CLOSE_VIEWER') {
        navigation.goBack();
      } else if (data.type === 'PDF_INFO' && data.numPages > 0) {
        setTotalPages(data.numPages);
      } else if (data.type === 'PAGE_CHANGE' && data.currentPage > 0) {
        setCurrentPage(data.currentPage);
      }
    } catch (e) {}
  };

  const handleScrollToPage = (targetPage: number) => {
    if (targetPage < 1 || targetPage > totalPages) return;
    const script = `
      (function() {
        const wrapper = document.querySelector('.page-wrapper[data-page="${targetPage}"]');
        if (wrapper) {
          wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      })();
      true;
    `;
    webViewRef.current?.injectJavaScript(script);
    setCurrentPage(targetPage);
  };

  const handleToggleFavorite = async () => {
    if (!pdf) return;
    const isFav = await pdfRepository.toggleFavorite(pdf.id);
    setPdf({ ...pdf, favorite: isFav });
  };

  const handleSharePdf = async () => {
    if (!pdf) return;
    Alert.alert(
      'Share PDF',
      `Share "${pdf.title}" with classmates or other apps:`,
      [
        {
          text: 'Share to Classmate (Chat)',
          onPress: () => navigation.navigate('Inbox'),
        },
        {
          text: 'Share via System',
          onPress: async () => {
            try {
              await shareService.shareFile(pdf.filePath, pdf.title);
            } catch (err: any) {
              Alert.alert('Share Error', err.message || 'Could not share PDF.');
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleGoToSubject = () => {
    if (!pdf) return;
    if (pdf.folderId) {
      navigation.navigate('FolderDetail', { subjectId: pdf.subjectId, folderId: pdf.folderId });
    } else {
      navigation.navigate('SubjectDetail', { subjectId: pdf.subjectId });
    }
  };

  const handleDeleteToTrash = async () => {
    if (!pdf) return;
    try {
      await fileService.moveToTrash(pdf.filePath, pdf.id);

      await trashRepository.add({
        itemId: pdf.id,
        itemType: 'pdf',
        originalPath: pdf.filePath,
        metadata: pdf,
      });

      await pdfRepository.delete(pdf.id);

      setShowDeleteConfirm(false);
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to move PDF to trash.');
    }
  };

  if (loading || !pdf) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader title="PDF Viewer" showBack onBack={() => navigation.goBack()} />
        <LoadingState message="Loading PDF..." />
      </View>
    );
  }

  const pdfHtmlContent = pdfBase64
    ? `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=0.5, maximum-scale=8.0, user-scalable=yes" />
      <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js"></script>
      <style>
        * { box-sizing: border-box; }
        html, body {
          margin: 0;
          padding: 0;
          background-color: #0F172A;
          width: 100%;
          min-height: 100%;
          overflow-x: auto;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-x pan-y pinch-zoom;
          -webkit-user-select: none;
          user-select: none;
        }
        #pdf-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 6px 0 80px 0;
          width: 100%;
          min-width: 100%;
        }
        .page-wrapper {
          width: 100%;
          max-width: 100%;
          display: flex;
          justify-content: center;
          margin-bottom: 12px;
          position: relative;
          overflow: visible;
        }
        canvas {
          width: 100% !important;
          max-width: 100%;
          height: auto !important;
          display: block;
          border-radius: 4px;
          box-shadow: 0 4px 14px rgba(0,0,0,0.45);
          transform-origin: center center;
          transition: transform 0.1s ease-out;
        }
        #loading {
          color: #94A3B8;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          font-weight: 500;
          margin-top: 48px;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div id="loading">📄 Rendering PDF document pages...</div>
      <div id="pdf-container"></div>
      <script>
        try {
          const b64Data = "${pdfBase64}";
          const raw = atob(b64Data);
          const uint8Array = new Uint8Array(raw.length);
          for (let i = 0; i < raw.length; i++) {
            uint8Array[i] = raw.charCodeAt(i);
          }
          
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
          
          const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
          loadingTask.promise.then(function(pdfDoc) {
            document.getElementById('loading').style.display = 'none';
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'PDF_INFO',
                numPages: pdfDoc.numPages
              }));
            }
            const container = document.getElementById('pdf-container');
            for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
              (function(num) {
                pdfDoc.getPage(num).then(function(page) {
                  const unscaled = page.getViewport({ scale: 1.0 });
                  const desiredWidth = window.innerWidth > 0 ? window.innerWidth : unscaled.width;
                  const scale = desiredWidth / unscaled.width;
                  const viewport = page.getViewport({ scale: scale * 1.8 });

                  const wrapper = document.createElement('div');
                  wrapper.className = 'page-wrapper';
                  wrapper.setAttribute('data-page', num);
                  wrapper.id = 'page-wrapper-' + num;

                  const canvas = document.createElement('canvas');
                  canvas.setAttribute('data-page', num);
                  const context = canvas.getContext('2d');
                  canvas.height = viewport.height;
                  canvas.width = viewport.width;
                  wrapper.appendChild(canvas);
                  container.appendChild(wrapper);

                  page.render({ canvasContext: context, viewport: viewport });
                  setupZoomAndPan(wrapper, canvas);
                });
              })(pageNum);
            }
          }).catch(function(err) {
            document.getElementById('loading').innerText = 'Unable to render PDF: ' + err.message;
          });

          // Fluid Pinch-to-Zoom & Left/Right 2D Panning Controller
          function setupZoomAndPan(wrapper, canvas) {
            let currentScale = 1.0;
            let posX = 0;
            let posY = 0;
            let startDist = 0;
            let initialScale = 1.0;
            let startTouchX = 0;
            let startTouchY = 0;
            let isDragging = false;
            let lastTapTime = 0;

            function getDistance(t1, t2) {
              return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
            }

            function updateTransform() {
              if (currentScale <= 1.02) {
                currentScale = 1.0;
                posX = 0;
                posY = 0;
                canvas.style.transform = 'none';
              } else {
                const maxPanX = (window.innerWidth * (currentScale - 1)) / 2 + 60;
                const maxPanY = (canvas.offsetHeight * (currentScale - 1)) / 2 + 100;
                posX = Math.max(-maxPanX, Math.min(maxPanX, posX));
                posY = Math.max(-maxPanY, Math.min(maxPanY, posY));
                canvas.style.transform = 'translate3d(' + posX + 'px, ' + posY + 'px, 0px) scale(' + currentScale + ')';
              }
            }

            wrapper.addEventListener('touchstart', function(e) {
              if (e.touches.length === 2) {
                startDist = getDistance(e.touches[0], e.touches[1]);
                initialScale = currentScale;
              } else if (e.touches.length === 1) {
                startTouchX = e.touches[0].clientX - posX;
                startTouchY = e.touches[0].clientY - posY;
                isDragging = currentScale > 1.05;
              }
            }, { passive: true });

            wrapper.addEventListener('touchmove', function(e) {
              if (e.touches.length === 2) {
                const dist = getDistance(e.touches[0], e.touches[1]);
                if (startDist > 0) {
                  const factor = dist / startDist;
                  currentScale = Math.min(Math.max(0.9, initialScale * factor), 7.0);
                  updateTransform();
                }
              } else if (e.touches.length === 1 && isDragging && currentScale > 1.05) {
                posX = e.touches[0].clientX - startTouchX;
                posY = e.touches[0].clientY - startTouchY;
                updateTransform();
              }
            }, { passive: true });

            wrapper.addEventListener('touchend', function(e) {
              if (e.touches.length === 0) {
                isDragging = false;
                startDist = 0;
                if (currentScale < 1.05) {
                  currentScale = 1.0;
                  posX = 0;
                  posY = 0;
                  updateTransform();
                }
              }
            }, { passive: true });

            wrapper.addEventListener('click', function(e) {
              const now = new Date().getTime();
              const diff = now - lastTapTime;
              if (diff < 300 && diff > 0) {
                if (currentScale > 1.1) {
                  currentScale = 1.0;
                  posX = 0;
                  posY = 0;
                } else {
                  currentScale = 2.4;
                  const rect = wrapper.getBoundingClientRect();
                  const tapX = e.clientX - rect.left - rect.width / 2;
                  posX = -tapX * 0.8;
                  posY = 0;
                }
                updateTransform();
              }
              lastTapTime = now;
            });
          }

          // Synchronized Viewport-center based active page tracking
          function detectActivePage() {
            const wrappers = document.querySelectorAll('.page-wrapper');
            if (!wrappers.length) return;

            let current = 1;
            const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
            const viewportCenter = viewportHeight / 2;
            const isAtBottom = (viewportHeight + window.scrollY) >= (document.documentElement.scrollHeight - 40);

            if (isAtBottom) {
              current = wrappers.length;
            } else {
              wrappers.forEach(function(wrap, index) {
                const rect = wrap.getBoundingClientRect();
                if (rect.top <= viewportCenter && rect.bottom >= viewportCenter) {
                  current = index + 1;
                }
              });
            }

            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'PAGE_CHANGE',
                currentPage: current
              }));
            }
          }

          window.addEventListener('scroll', detectActivePage, { passive: true });
          window.addEventListener('load', detectActivePage);
        } catch(e) {
          document.getElementById('loading').innerText = 'Failed to parse PDF binary data.';
        }
      </script>
    </body>
    </html>
  `
    : undefined;

  const bottomInset = Math.max(insets.bottom, 8);
  const bottomBadgePos = Math.max(insets.bottom, 24) + 12;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title={pdf.title}
        subtitle={`${pdf.subjectName ? pdf.subjectName : ''} • ${formatPageCount(totalPages)}`}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity onPress={handleGoToSubject} style={styles.headerBtn}>
              <Ionicons name="folder-open-outline" size={22} color={theme.colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleToggleFavorite} style={styles.headerBtn}>
              <Ionicons
                name={pdf.favorite ? 'star' : 'star-outline'}
                size={22}
                color={pdf.favorite ? theme.colors.favorite : theme.colors.text}
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowOptions(true)} style={styles.headerBtn}>
              <Ionicons name="ellipsis-vertical" size={22} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Quick Navigation Breadcrumb Bar */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleGoToSubject}
        style={[styles.breadcrumbBar, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}
      >
        <Ionicons name="arrow-back-outline" size={16} color={theme.colors.primary} />
        <Text style={[styles.breadcrumbText, { color: theme.colors.primary }]}>
          Back to {pdf.subjectName || 'Subject'} Folder
        </Text>
      </TouchableOpacity>

      <View style={[styles.webContainer, { paddingBottom: bottomInset }]}>
        <WebView
          ref={webViewRef}
          source={pdfHtmlContent ? { html: pdfHtmlContent } : { uri: pdf.filePath }}
          originWhitelist={['*']}
          allowFileAccess={true}
          allowUniversalAccessFromFileURLs={true}
          scalesPageToFit={true}
          setBuiltInZoomControls={true}
          setDisplayZoomControls={false}
          onMessage={handleMessage}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
          mixedContentMode="always"
          style={{ flex: 1, backgroundColor: '#0F172A' }}
        />

        {/* Real-time PDF Page Counter & Navigation Bar */}
        <View style={[styles.pageCounterBar, { bottom: bottomBadgePos }]}>
          <TouchableOpacity
            onPress={() => handleScrollToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            style={[styles.navArrowBtn, currentPage <= 1 && { opacity: 0.3 }]}
          >
            <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={styles.counterText}>
            Page {currentPage} of {totalPages}
          </Text>

          <TouchableOpacity
            onPress={() => handleScrollToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            style={[styles.navArrowBtn, currentPage >= totalPages && { opacity: 0.3 }]}
          >
            <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <BottomSheet
        visible={showOptions}
        title={pdf.title}
        onClose={() => setShowOptions(false)}
        options={[
          {
            id: 'goSubject',
            label: `Go to ${pdf.subjectName || 'Subject'} Folder`,
            icon: 'folder-open-outline',
            onPress: handleGoToSubject,
          },
          {
            id: 'share',
            label: 'Share PDF File',
            icon: 'share-outline',
            onPress: handleSharePdf,
          },
          {
            id: 'delete',
            label: 'Move to Trash',
            icon: 'trash-outline',
            danger: true,
            onPress: () => setShowDeleteConfirm(true),
          },
        ]}
      />

      <ConfirmDialog
        visible={showDeleteConfirm}
        title="Move PDF to Trash?"
        message={`"${pdf.title}" will be moved to Trash. You can restore it anytime from Trash settings.`}
        confirmTitle="Move to Trash"
        isDanger
        onConfirm={handleDeleteToTrash}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBtn: { padding: 6 },
  breadcrumbBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  breadcrumbText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  webContainer: { flex: 1, position: 'relative' },
  pageCounterBar: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
  },
  navArrowBtn: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  counterText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    marginHorizontal: 10,
  },
});
