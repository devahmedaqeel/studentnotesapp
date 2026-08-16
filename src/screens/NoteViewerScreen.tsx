import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../hooks/useTheme';
import { AppHeader } from '../components/common/AppHeader';
import { LoadingState } from '../components/common/LoadingState';
import { BottomSheet } from '../components/common/BottomSheet';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Ionicons } from '@expo/vector-icons';
import { noteRepository } from '../database/repositories/noteRepository';
import { trashRepository } from '../database/repositories/trashRepository';
import { shareService } from '../services/shareService';
import { fileService } from '../services/fileService';
import { Note } from '../types/note';
import { formatPageCount } from '../utils/formatting';

type Props = NativeStackScreenProps<RootStackParamList, 'NoteViewer'>;

export const NoteViewerScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { noteId } = route.params;
  const webViewRef = useRef<WebView>(null);

  const [note, setNote] = useState<Note | null>(null);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const [showOptions, setShowOptions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fetchNote = async () => {
    try {
      const data = await noteRepository.getById(noteId);
      setNote(data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load note.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNote();
  }, [noteId]);

  const handleToggleFavorite = async () => {
    if (!note) return;
    const isFav = await noteRepository.toggleFavorite(note.id);
    setNote({ ...note, favorite: isFav });
  };

  const handleShareNote = async () => {
    if (!note || !note.pages || note.pages.length === 0) return;
    try {
      const imageUris = note.pages.map((p) => p.filePath);
      await shareService.shareImages(imageUris, note.title);
    } catch (err: any) {
      Alert.alert('Share Error', err.message || 'Could not share note images.');
    }
  };

  const handleExportAsPdf = () => {
    if (!note || !note.pages || note.pages.length === 0) return;
    const imagePaths = note.pages.map((p) => p.filePath);
    navigation.navigate('CreatePdf', {
      imagePaths,
      subjectId: note.subjectId,
      folderId: note.folderId || undefined,
    });
  };

  const handleGoToSubject = () => {
    if (!note) return;
    if (note.folderId) {
      navigation.navigate('FolderDetail', { subjectId: note.subjectId, folderId: note.folderId });
    } else {
      navigation.navigate('SubjectDetail', { subjectId: note.subjectId });
    }
  };

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'CLOSE_VIEWER') {
        navigation.goBack();
      } else if (data.type === 'PAGE_CHANGE' && data.currentPage > 0) {
        setActivePageIndex(data.currentPage - 1);
      }
    } catch (e) {}
  };

  const handleScrollToPage = (pageIdx: number) => {
    if (pageIdx < 0 || !note?.pages || pageIdx >= note.pages.length) return;
    const script = `
      (function() {
        const target = document.querySelector('.page-wrapper[data-page="${pageIdx + 1}"]');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      })();
      true;
    `;
    webViewRef.current?.injectJavaScript(script);
    setActivePageIndex(pageIdx);
  };

  const handleDeleteToTrash = async () => {
    if (!note) return;
    try {
      const noteDir = fileService.getNoteDir(note.subjectId, note.id);
      await fileService.moveToTrash(noteDir, note.id);

      await trashRepository.add({
        itemId: note.id,
        itemType: 'note',
        originalPath: noteDir,
        metadata: note,
      });

      await noteRepository.delete(note.id);

      setShowDeleteConfirm(false);
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to move note to trash.');
    }
  };

  if (loading || !note) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader title="Note Viewer" showBack onBack={() => navigation.goBack()} />
        <LoadingState message="Loading note..." />
      </View>
    );
  }

  const pages = note.pages || [];
  const bottomBadgePos = Math.max(insets.bottom, 24) + 12;
  const bottomInset = Math.max(insets.bottom, 8);

  const pagesHtml = pages
    .map(
      (p, idx) => `
    <div class="page-wrapper" data-page="${idx + 1}" id="page-wrapper-${idx + 1}">
      <img src="${p.filePath}" class="note-page" alt="Page ${idx + 1}" />
    </div>
  `
    )
    .join('');

  const noteHtmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=0.5, maximum-scale=8.0, user-scalable=yes" />
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
        #container {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          min-width: 100%;
          padding: 6px 0 80px 0;
          transform-origin: 0 0;
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
        .note-page {
          width: 100% !important;
          max-width: 100%;
          height: auto !important;
          display: block;
          object-fit: contain;
          border-radius: 4px;
          box-shadow: 0 4px 14px rgba(0,0,0,0.45);
          transform-origin: center center;
          transition: transform 0.1s ease-out;
        }
      </style>
    </head>
    <body>
      <div id="container">
        ${pagesHtml}
      </div>
      <script>
        // Fluid Pinch-To-Zoom & 2D Pan System for each Page
        document.querySelectorAll('.page-wrapper').forEach(function(wrapper) {
          const img = wrapper.querySelector('.note-page');
          if (!img) return;

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
            // Apply scale and 2D pan allowing full left/right/up/down exploration
            if (currentScale <= 1.02) {
              currentScale = 1.0;
              posX = 0;
              posY = 0;
              img.style.transform = 'none';
            } else {
              // Clamp pan boundaries based on zoom magnification
              const maxPanX = (window.innerWidth * (currentScale - 1)) / 2 + 60;
              const maxPanY = (img.offsetHeight * (currentScale - 1)) / 2 + 100;
              posX = Math.max(-maxPanX, Math.min(maxPanX, posX));
              posY = Math.max(-maxPanY, Math.min(maxPanY, posY));
              img.style.transform = 'translate3d(' + posX + 'px, ' + posY + 'px, 0px) scale(' + currentScale + ')';
            }
          }

          wrapper.addEventListener('touchstart', function(e) {
            if (e.touches.length === 2) {
              // Two finger pinch initiation
              startDist = getDistance(e.touches[0], e.touches[1]);
              initialScale = currentScale;
            } else if (e.touches.length === 1) {
              // Single finger pan when zoomed
              startTouchX = e.touches[0].clientX - posX;
              startTouchY = e.touches[0].clientY - posY;
              isDragging = currentScale > 1.05;
            }
          }, { passive: true });

          wrapper.addEventListener('touchmove', function(e) {
            if (e.touches.length === 2) {
              // Pinch zooming in/out smoothly to user preference
              const dist = getDistance(e.touches[0], e.touches[1]);
              if (startDist > 0) {
                const factor = dist / startDist;
                currentScale = Math.min(Math.max(0.9, initialScale * factor), 7.0);
                updateTransform();
              }
            } else if (e.touches.length === 1 && isDragging && currentScale > 1.05) {
              // Smooth 2D panning left/right/up/down
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

          // Double-Tap to zoom in/out
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
                // Center zoom on tap offset
                const rect = wrapper.getBoundingClientRect();
                const tapX = e.clientX - rect.left - rect.width / 2;
                posX = -tapX * 0.8;
                posY = 0;
              }
              updateTransform();
            }
            lastTapTime = now;
          });
        });

        // Viewport-center based active page tracking
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
      </script>
    </body>
    </html>
  `;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title={note.title}
        subtitle={`${note.subjectName ? note.subjectName : ''} • ${formatPageCount(pages.length)}`}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity onPress={handleGoToSubject} style={styles.headerBtn}>
              <Ionicons name="folder-open-outline" size={22} color={theme.colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleToggleFavorite} style={styles.headerBtn}>
              <Ionicons
                name={note.favorite ? 'star' : 'star-outline'}
                size={22}
                color={note.favorite ? theme.colors.favorite : theme.colors.text}
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowOptions(true)} style={styles.headerBtn}>
              <Ionicons name="ellipsis-vertical" size={22} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Pages View with Full Custom Pinch-to-Zoom & Left/Right 2D Panning */}
      {pages.length > 0 ? (
        <View style={[styles.webContainer, { paddingBottom: bottomInset }]}>
          <WebView
            ref={webViewRef}
            source={{ html: noteHtmlContent }}
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

          {/* Synchronized Page Counter & Nav Bar */}
          <View style={[styles.pageCounterBar, { bottom: bottomBadgePos }]}>
            <TouchableOpacity
              onPress={() => handleScrollToPage(activePageIndex - 1)}
              disabled={activePageIndex === 0}
              style={[styles.navArrowBtn, activePageIndex === 0 && { opacity: 0.3 }]}
            >
              <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
            </TouchableOpacity>

            <Text style={styles.counterText}>
              Page {activePageIndex + 1} of {pages.length}
            </Text>

            <TouchableOpacity
              onPress={() => handleScrollToPage(activePageIndex + 1)}
              disabled={activePageIndex >= pages.length - 1}
              style={[styles.navArrowBtn, activePageIndex >= pages.length - 1 && { opacity: 0.3 }]}
            >
              <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={[theme.typography.body1, { color: theme.colors.textSecondary }]}>
            No page images found for this note.
          </Text>
        </View>
      )}

      {/* Options Bottom Sheet */}
      <BottomSheet
        visible={showOptions}
        title={note.title}
        onClose={() => setShowOptions(false)}
        options={[
          {
            id: 'goSubject',
            label: `Go to ${note.subjectName || 'Subject'} Folder`,
            icon: 'folder-open-outline',
            onPress: handleGoToSubject,
          },
          {
            id: 'exportPdf',
            label: 'Export as PDF',
            icon: 'document-outline',
            onPress: handleExportAsPdf,
          },
          {
            id: 'share',
            label: 'Share Pages',
            icon: 'share-outline',
            onPress: handleShareNote,
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

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        visible={showDeleteConfirm}
        title="Move to Trash?"
        message={`"${note.title}" will be moved to Trash. You can restore it anytime from Trash settings.`}
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
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
