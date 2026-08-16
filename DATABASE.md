# StudentNotes - Database Architecture & Schema

StudentNotes utilizes **SQLite 3** via `expo-sqlite` for fast, offline-first local data storage, combined with **Supabase PostgreSQL** for cloud backup and synchronization.

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

documents (id, userId, folderId, title, filePath, fileType, fileSize, tags, favorite, createdAt, updatedAt)
document_folders (id, userId, name, color, icon, createdAt, updatedAt)

saved_links (id, userId, originalUrl, cleanedUrl, title, resourceType, customType, domain, faviconUrl, previewImageUrl, description, subjectId, subjectName, category, tags, personalNote, favorite, createdAt, updatedAt)

diary_events (id, userId, title, description, eventType, priority, dueDate, reminderTime, isCompleted, isRecurring, recurrencePattern, subjectId, createdAt, updatedAt)
diary_attachments (id, eventId, fileName, filePath, fileType, fileSize, createdAt)

timetable_classes (id, userId, subjectName, subjectCode, room, instructor, dayOfWeek, startTime, endTime, color, reminderMinutes, createdAt, updatedAt)
timetable_settings (userId, notifyBeforeClass, defaultReminderMinutes, dailySummaryNotification, dailySummaryTime, weekendClassesEnabled, updatedAt)

student_connections (id, requesterId, receiverId, status, createdAt, updatedAt)
student_blocked (id, userId, blockedUserId, createdAt)
student_statuses (id, userId, statusType, content, mediaUrl, mediaType, caption, bgColor, createdAt, expiresAt)
status_views (statusId, viewerId, viewedAt)

tags (id, name)
trash (id, itemId, itemType, originalPath, metadata, deletedAt)
```

---

## Table Schemas & Definitions

### 1. TABLE: `subjects`
- `id` (TEXT PRIMARY KEY)
- `name` (TEXT NOT NULL)
- `icon` (TEXT)
- `color` (TEXT)
- `createdAt` (INTEGER NOT NULL)
- `updatedAt` (INTEGER NOT NULL)

### 2. TABLE: `folders`
- `id` (TEXT PRIMARY KEY)
- `subjectId` (TEXT NOT NULL, FK -> subjects.id)
- `name` (TEXT NOT NULL)
- `createdAt` (INTEGER NOT NULL)
- `updatedAt` (INTEGER NOT NULL)

### 3. TABLE: `notes` & `note_pages`
- `notes`: `id`, `subjectId`, `folderId`, `title`, `thumbnailPath`, `favorite`, `createdAt`, `updatedAt`
- `note_pages`: `id`, `noteId` (FK), `pageNumber`, `filePath`, `createdAt`

### 4. TABLE: `pdfs`
- `id` (TEXT PRIMARY KEY), `subjectId`, `folderId`, `title`, `filePath`, `pageCount`, `favorite`, `createdAt`, `updatedAt`

### 5. TABLE: `documents` & `document_folders`
- `documents`: `id`, `userId`, `folderId`, `title`, `filePath`, `fileType`, `fileSize`, `tags`, `favorite`, `createdAt`, `updatedAt`
- `document_folders`: `id`, `userId`, `name`, `color`, `icon`, `createdAt`, `updatedAt`

### 6. TABLE: `saved_links`
- `id` (TEXT PRIMARY KEY), `userId`, `originalUrl`, `cleanedUrl`, `title`, `resourceType`, `customType`, `domain`, `faviconUrl`, `previewImageUrl`, `description`, `subjectId`, `subjectName`, `category`, `tags`, `personalNote`, `favorite`, `createdAt`, `updatedAt`

### 7. TABLE: `diary_events` & `diary_attachments`
- `diary_events`: `id`, `userId`, `title`, `description`, `eventType`, `priority`, `dueDate`, `reminderTime`, `isCompleted`, `isRecurring`, `recurrencePattern`, `subjectId`, `createdAt`, `updatedAt`
- `diary_attachments`: `id`, `eventId` (FK), `fileName`, `filePath`, `fileType`, `fileSize`, `createdAt`

### 8. TABLE: `timetable_classes` & `timetable_settings`
- `timetable_classes`: `id`, `userId`, `subjectName`, `subjectCode`, `room`, `instructor`, `dayOfWeek`, `startTime`, `endTime`, `color`, `reminderMinutes`, `createdAt`, `updatedAt`
- `timetable_settings`: `userId` (PRIMARY KEY), `notifyBeforeClass`, `defaultReminderMinutes`, `dailySummaryNotification`, `dailySummaryTime`, `weekendClassesEnabled`, `updatedAt`

### 9. TABLE: `student_connections`, `student_statuses`, `status_views`
- `student_connections`: `id`, `requesterId`, `receiverId`, `status`, `createdAt`, `updatedAt`
- `student_blocked`: `id`, `userId`, `blockedUserId`, `createdAt`
- `student_statuses`: `id`, `userId`, `statusType`, `content`, `mediaUrl`, `mediaType`, `caption`, `bgColor`, `createdAt`, `expiresAt`
- `status_views`: `statusId`, `viewerId`, `viewedAt`, PRIMARY KEY(`statusId`, `viewerId`)

### 10. TABLE: `trash`
- `id` (TEXT PRIMARY KEY), `itemId`, `itemType`, `originalPath`, `metadata` (JSON), `deletedAt`
