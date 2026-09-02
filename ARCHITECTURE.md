# STUDENTNOTES SYSTEM ARCHITECTURE DOCUMENT

## 1. System Overview

StudentNotes is an **offline-first**, production-ready student productivity, document management, and academic scheduling application built using **React Native (0.81.5)**, **Expo SDK 54**, **TypeScript**, **SQLite**, **Supabase Cloud**, and **Firebase**.

```
                           StudentNotes Application
                                      │
              ┌───────────────────────┴───────────────────────┐
              ▼                                               ▼
        OFFLINE MODE                                 AUTHENTICATED MODE
      (Default / Guest)                        (Firebase Auth / Supabase Session)
              │                                               │
     SQLite + Local Files                            SQLite + Cloud Sync
   (No internet connection)                 (PostgreSQL RLS + Firebase Firestore)
              │                                               │
              └───────────────────────┬───────────────────────┘
                                      ▼
                             Sync & Backup Engine
                          (Account-Isolated Merging)
                                      │
                                      ▼
                        Expo Application Services (EAS)
                         (Continuous Cloud APK Builds)
```

---

## 2. Architecture Layers

The application adheres strictly to a clean 5-layer separation of concerns pattern:

`UI Views & Components` ➔ `React Custom Hooks` ➔ `Services Layer` ➔ `Repositories` ➔ `SQLite Local DB / Cloud Sync`

### 1. Presentation & Screens
* **Academic Suite**: `HomeScreen`, `ScannerScreen`, `DocumentCropScreen`, `SaveNoteScreen`, `NoteViewerScreen`, `CreatePdfScreen`, `PdfViewerScreen`, `DocumentVaultScreen`, `StudentDiaryScreen`, `TimetableScreen`, `SavedLinksScreen`, `SaveLinkScreen`, `ImageCompressionScreen`, `PdfCompressionScreen`.
* **Student Connect**: `InboxScreen` (Updates, Requests, Friends), `StudentProfileScreen`, `StudentSearchScreen`, `CreateStatusModal`.
* **Universal Common**: `AppHeader`, `AppButton`, `AppInput`, `AppDatePicker`, `AppTimePicker`, `SwipeableRow`, `BottomSheet`, `ConfirmDialog`.

### 2. Custom Hooks
* `useAuth`, `useTheme`, `useSubjects`, `useNotes`, `usePdfs`, `useDocuments`, `useDiary`, `useTimetable`, `useConnect`.

### 3. Services Layer
* `authService`: Manages hybrid Firebase & Supabase authentication, session persistence, and guest modes.
* `localAccountService`: Isolated offline credential management and token caching.
* `syncService`: Bidirectional synchronization between SQLite and remote cloud backends.
* `linkService`: Smart URL cleaning, tracker removal, and automatic metadata scraping.
* `imageCompressionService`: High-ratio photo compression and gallery export.
* `pdfCompressionService` & `pdfCreationService`: Multi-page document compilation and size optimization.
* `notificationService`: Local scheduled reminders for class timetables and assignment deadlines.

### 4. Repositories (Data Access Objects)
* `subjectRepository`, `folderRepository`, `noteRepository`, `pdfRepository`, `savedLinkRepository`, `documentRepository`, `diaryRepository`, `timetableRepository`, `trashRepository`.

### 5. Data & Storage Layer
* **Local SQLite**: `student_notes.db` executed through `expo-sqlite`.
* **Device Storage**: Sandboxed file system via `expo-file-system`.
* **Cloud Persistence**: Supabase PostgreSQL with strict Row-Level Security (`auth.uid() = user_id`) and Firebase Firestore / Storage.

---

## 3. Key Architectural Pillars

### 1. Offline-First Guarantee
All document creation, note editing, camera scanning, crop manipulations, timetable viewing, and diary tasks run immediately on device without latency or network dependency.

### 2. Smart URL Optimization Engine
When saving web links, `linkService` dynamically removes invasive marketing parameters (`utm_*`, `fbclid`, `gclid`, `msclkid`, `si`, `spm`) while preserving operational parameters (`id`, `v`, `t`, `page`, `search`, `doc`).

### 3. Multi-Account Data Isolation
* Primary identity is anchored to authenticated UUIDs.
* When logging out, local SQLite tables and caches are cleaned to prevent information leakage across accounts.
* When logging into a new or existing account, cloud data matching that user ID is fetched and restored.

### 4. Standalone APK Cloud Build Pipeline (EAS)
The application leverages Expo Application Services (EAS Build) with Continuous Native Generation (CNG):
* Configured under EAS Project ID: `26b9a18b-db4f-4ee8-8e48-dc2cba7509a4`.
* Builds standalone Android APKs (`preview` and `production` profiles) with Hermes bytecode optimization.
* Automated NDK versioning (27.0.12077973) and Android Gradle memory optimization (4096m JVM).
