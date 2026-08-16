# STUDENTNOTES SYSTEM ARCHITECTURE DOCUMENT

## 1. System Overview

StudentNotes is an **offline-first**, modern student productivity and academic networking application built using **React Native (Expo SDK 54)**, **TypeScript**, **SQLite**, and **Supabase Cloud**.

```
                      StudentNotes Application
                                 │
             ┌───────────────────┴───────────────────┐
             ▼                                       ▼
       OFFLINE MODE                          AUTHENTICATED MODE
     (Default / Guest)                        (Supabase Session)
             │                                       │
    SQLite + Local Files                    SQLite + Cloud Sync
  (No internet connection)                 (PostgreSQL + Storage)
             │                                       │
             └───────────────────┬───────────────────┘
                                 ▼
                        Sync & Backup Engine
                    (Account-Isolated Merging)
```

---

## 2. Architecture Layers

To ensure modularity and scalability, the application adheres strictly to a clean 5-layer pattern:

`UI Views & Components` -> `React Custom Hooks` -> `Services Layer` -> `Repositories` -> `SQLite Local DB / Supabase Cloud`

1. **Screens / Components**:
   - **Academic Suite**: `HomeScreen`, `ScannerScreen`, `ScanPreviewScreen`, `SaveNoteScreen`, `NoteViewerScreen`, `CreatePdfScreen`, `PdfViewerScreen`, `DocumentVaultScreen`, `StudentDiaryScreen`, `TimetableScreen`, `SavedLinksScreen`, `SaveLinkScreen`.
   - **Student Connect**: `InboxScreen` (Updates, Requests, Friends), `StudentProfileScreen`, `StudentSearchScreen`, `CreateStatusModal`.
   - **Common & Layout**: `AppHeader`, `AppButton`, `AppInput`, `ImageCropModal`, `ResourceCard`.
2. **Custom Hooks**:
   - `useAuth`, `useTheme`, `useSubjects`, `useNotes`, `usePdfs`, `useConnect`.
3. **Services**:
   - `syncService`, `connectService`, `linkService`, `statusService`, `presenceService`, `notificationService`, `imageService`, `pdfService`, `fileService`.
4. **Repositories**:
   - `subjectRepository`, `folderRepository`, `noteRepository`, `pdfRepository`, `savedLinkRepository`, `documentRepository`, `diaryRepository`, `timetableRepository`, `trashRepository`.
5. **Data Layer**:
   - Local SQLite database (`student_notes.db`) & Supabase PostgreSQL with strict Row-Level Security (`auth.uid() = user_id`).

---

## 3. Key Architectural Pillars

### Offline-First Guarantee
All user data creation, editing, scanning, PDF generation, timetable scheduling, diary tracking, and link saving execute immediately against local SQLite and device storage (`app-storage/`). No active internet connection is required for day-to-day academic workflows.

### Smart URL Optimization Engine
When saving academic research links, `linkService` parses input URLs, identifies and strips known tracking/advertising parameters (`utm_*`, `fbclid`, `gclid`, `msclkid`, `si`, etc.), while strictly preserving critical query parameters (`id`, `page`, `v`, `t`, `search`, `doc`) to ensure the target destination continues to function seamlessly.

### Multi-Account Data Isolation
- Primary identity is anchored to Supabase `auth.uid()` (UUID).
- On logout, local SQLite caches are purged to prevent cross-account leakage.
- On login, cloud data matching `auth.uid()` is downloaded and restored into SQLite.

### 4-Corner Quadrilateral Document Scanner
The camera scanning engine captures lecture notes and slides, providing interactive 4-corner boundary adjustment, perspective correction, image compression, and PDF compilation offline.
