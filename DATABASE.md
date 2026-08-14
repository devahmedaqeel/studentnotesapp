# StudentNotes - Database Architecture & Schema

StudentNotes uses **SQLite** via `expo-sqlite` for local structured data storage.

---

## Database Schema Diagram

```
subjects (id, name, icon, color, createdAt, updatedAt)
   │
   ├──< folders (id, subjectId, name, createdAt, updatedAt)
   │       │
   │       ├──< notes (id, subjectId, folderId, title, thumbnailPath, favorite, createdAt, updatedAt)
   │       │       │
   │       │       ├──< note_pages (id, noteId, pageNumber, filePath, createdAt)
   │       │       └──< note_tags (noteId, tagId)
   │       │
   │       └──< pdfs (id, subjectId, folderId, title, filePath, pageCount, favorite, createdAt, updatedAt)

tags (id, name)
trash (id, itemId, itemType, originalPath, metadata, deletedAt)
```

---

## Table Schemas & Indexes

### TABLE: subjects
- `id` (TEXT PRIMARY KEY)
- `name` (TEXT NOT NULL)
- `icon` (TEXT)
- `color` (TEXT)
- `createdAt` (INTEGER NOT NULL)
- `updatedAt` (INTEGER NOT NULL)

### TABLE: folders
- `id` (TEXT PRIMARY KEY)
- `subjectId` (TEXT NOT NULL, FK -> subjects.id)
- `name` (TEXT NOT NULL)
- `createdAt` (INTEGER NOT NULL)
- `updatedAt` (INTEGER NOT NULL)

### TABLE: notes
- `id` (TEXT PRIMARY KEY)
- `subjectId` (TEXT NOT NULL, FK -> subjects.id)
- `folderId` (TEXT, FK -> folders.id)
- `title` (TEXT NOT NULL)
- `thumbnailPath` (TEXT)
- `favorite` (INTEGER DEFAULT 0)
- `createdAt` (INTEGER NOT NULL)
- `updatedAt` (INTEGER NOT NULL)

### TABLE: note_pages
- `id` (TEXT PRIMARY KEY)
- `noteId` (TEXT NOT NULL, FK -> notes.id)
- `pageNumber` (INTEGER NOT NULL)
- `filePath` (TEXT NOT NULL)
- `createdAt` (INTEGER NOT NULL)

### TABLE: pdfs
- `id` (TEXT PRIMARY KEY)
- `subjectId` (TEXT NOT NULL, FK -> subjects.id)
- `folderId` (TEXT, FK -> folders.id)
- `title` (TEXT NOT NULL)
- `filePath` (TEXT NOT NULL)
- `pageCount` (INTEGER DEFAULT 0)
- `favorite` (INTEGER DEFAULT 0)
- `createdAt` (INTEGER NOT NULL)
- `updatedAt` (INTEGER NOT NULL)

### TABLE: tags & note_tags
- `tags`: `id` (TEXT PRIMARY KEY), `name` (TEXT UNIQUE NOT NULL)
- `note_tags`: `noteId` (TEXT NOT NULL), `tagId` (TEXT NOT NULL), PRIMARY KEY(noteId, tagId)

### TABLE: trash
- `id` (TEXT PRIMARY KEY)
- `itemId` (TEXT NOT NULL)
- `itemType` (TEXT NOT NULL)
- `originalPath` (TEXT)
- `metadata` (TEXT - JSON backup)
- `deletedAt` (INTEGER NOT NULL)

### Indexes
- `idx_subjects_name` on `subjects(name)`
- `idx_folders_subjectId` on `folders(subjectId)`
- `idx_notes_subjectId` on `notes(subjectId)`
- `idx_notes_folderId` on `notes(folderId)`
- `idx_notes_title` on `notes(title)`
- `idx_pdfs_subjectId` on `pdfs(subjectId)`
- `idx_pdfs_title` on `pdfs(title)`
