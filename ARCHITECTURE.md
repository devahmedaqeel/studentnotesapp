# STUDENTNOTES SYSTEM ARCHITECTURE DOCUMENT

## 1. System Overview

StudentNotes is an **offline-first** React Native (Expo SDK 54) mobile application designed for student handwritten notes, document scanning, and PDF management.

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
                    (Bidirectional Merging)
```

---

## 2. Architecture Layers

To ensure clean separation of concerns, the application follows a layered pattern:

`UI Components / Screens` -> `React Custom Hooks` -> `Services Layer` -> `Repositories` -> `SQLite Local DB / Supabase Cloud`

1. **Screens / Components**: Render native mobile UI views (`HomeScreen`, `ScannerScreen`, `NoteViewerScreen`, `ProfileScreen`).
2. **Custom Hooks**: Manage view state & data lifecycle (`useSubjects`, `useNotes`, `usePdfs`, `useAuth`, `useTheme`).
3. **Services**: Encapsulate business logic (`authService`, `profileService`, `syncService`, `imageService`, `pdfService`, `fileService`).
4. **Repositories**: Execute local SQLite queries (`subjectRepository`, `folderRepository`, `noteRepository`, `pdfRepository`, `trashRepository`).
5. **Data Layer**: Local SQLite database (`student_notes.db`) & Supabase Cloud PostgreSQL database with Row Level Security (RLS).

---

## 3. Offline-First Principles

1. **Primary Immediate Local Experience**: All core user actions (capturing images, creating notes, editing pages, compiling PDFs, editing subjects/folders, searching, favoring, deleting) execute immediately against SQLite and the local device file system (`app-storage/`).
2. **Zero Internet Barrier**: The application launches directly to the user's workspace in `OFFLINE_MODE` if authentication is not chosen.
3. **Logout Safety**: Logging out from a cloud account switches the device to `OFFLINE_MODE` without purging local notes or storage.

---

## 4. Cloud Backup & Sync Engine

### Bidirectional Merge Strategy
When an offline user authenticates or triggers manual/automatic cloud sync:
1. **Local-Only Records**: Upserted to Supabase PostgreSQL database tables (`subjects`, `folders`, `notes`, `note_pages`, `pdfs`, `tags`).
2. **Image & PDF File Uploads**: Scanned page JPEGs are uploaded to `note-files/{userId}/*` and generated PDFs to `pdf-files/{userId}/*` bucket paths.
3. **Remote-Only Records**: Fetched from Supabase and inserted into local SQLite database for device access.
4. **Conflict Resolution**: Same-ID conflicts compare ISO `updated_at` timestamps to preserve the latest record while retaining local physical files.
