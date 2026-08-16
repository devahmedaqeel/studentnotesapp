export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY,
  subjectId TEXT NOT NULL,
  name TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  FOREIGN KEY (subjectId) REFERENCES subjects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  subjectId TEXT NOT NULL,
  folderId TEXT,
  title TEXT NOT NULL,
  thumbnailPath TEXT,
  favorite INTEGER DEFAULT 0,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  FOREIGN KEY (subjectId) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (folderId) REFERENCES folders(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS note_pages (
  id TEXT PRIMARY KEY,
  noteId TEXT NOT NULL,
  pageNumber INTEGER NOT NULL,
  filePath TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  FOREIGN KEY (noteId) REFERENCES notes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pdfs (
  id TEXT PRIMARY KEY,
  subjectId TEXT NOT NULL,
  folderId TEXT,
  title TEXT NOT NULL,
  filePath TEXT NOT NULL,
  pageCount INTEGER DEFAULT 0,
  favorite INTEGER DEFAULT 0,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  FOREIGN KEY (subjectId) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (folderId) REFERENCES folders(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS note_tags (
  noteId TEXT NOT NULL,
  tagId TEXT NOT NULL,
  PRIMARY KEY(noteId, tagId),
  FOREIGN KEY (noteId) REFERENCES notes(id) ON DELETE CASCADE,
  FOREIGN KEY (tagId) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS trash (
  id TEXT PRIMARY KEY,
  itemId TEXT NOT NULL,
  itemType TEXT NOT NULL,
  originalPath TEXT,
  metadata TEXT,
  deletedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS document_folders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#4F46E5',
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  userId TEXT,
  title TEXT NOT NULL,
  originalFileName TEXT NOT NULL,
  filePath TEXT NOT NULL,
  fileType TEXT NOT NULL,
  mimeType TEXT NOT NULL,
  fileSizeBytes INTEGER DEFAULT 0,
  folderId TEXT,
  category TEXT,
  favorite INTEGER DEFAULT 0,
  cloudUrl TEXT,
  thumbnailPath TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  FOREIGN KEY (folderId) REFERENCES document_folders(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS diary_events (
  id TEXT PRIMARY KEY,
  userId TEXT,
  title TEXT NOT NULL,
  eventType TEXT NOT NULL,
  subjectId TEXT,
  description TEXT,
  dueDate TEXT NOT NULL,
  dueTime TEXT,
  dueTimestamp INTEGER NOT NULL,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'upcoming',
  isImportant INTEGER DEFAULT 0,
  reminderEnabled INTEGER DEFAULT 1,
  reminderType TEXT DEFAULT '1_day',
  dailyUntilCompleted INTEGER DEFAULT 0,
  completedAt INTEGER,
  notificationIds TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  FOREIGN KEY (subjectId) REFERENCES subjects(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS diary_attachments (
  id TEXT PRIMARY KEY,
  eventId TEXT NOT NULL,
  documentId TEXT,
  title TEXT NOT NULL,
  filePath TEXT NOT NULL,
  fileType TEXT NOT NULL,
  fileSizeBytes INTEGER DEFAULT 0,
  createdAt INTEGER NOT NULL,
  FOREIGN KEY (eventId) REFERENCES diary_events(id) ON DELETE CASCADE,
  FOREIGN KEY (documentId) REFERENCES documents(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS timetable_classes (
  id TEXT PRIMARY KEY,
  userId TEXT,
  subjectId TEXT,
  subjectName TEXT NOT NULL,
  subjectColor TEXT,
  teacherName TEXT,
  dayOfWeek TEXT NOT NULL,
  startTime TEXT NOT NULL,
  endTime TEXT NOT NULL,
  room TEXT,
  building TEXT,
  notes TEXT,
  reminderEnabled INTEGER DEFAULT 1,
  reminderMinutes INTEGER DEFAULT 10,
  notificationId TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  FOREIGN KEY (subjectId) REFERENCES subjects(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS timetable_settings (
  id TEXT PRIMARY KEY,
  dailyNotificationEnabled INTEGER DEFAULT 1,
  notificationTime TEXT DEFAULT '01:00',
  notifyFreeDays INTEGER DEFAULT 0,
  classRemindersEnabled INTEGER DEFAULT 1,
  defaultReminderMinutes INTEGER DEFAULT 10,
  updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS student_profiles (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  publicStudentId TEXT UNIQUE NOT NULL,
  displayName TEXT NOT NULL,
  avatarUrl TEXT,
  bio TEXT,
  program TEXT,
  semester TEXT,
  university TEXT,
  onlineStatus TEXT DEFAULT 'offline',
  lastSeen TEXT,
  followersCount INTEGER DEFAULT 0,
  followingCount INTEGER DEFAULT 0,
  usernameChangedAt INTEGER,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS username_history (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  username TEXT NOT NULL,
  normalizedUsername TEXT NOT NULL UNIQUE,
  createdAt INTEGER NOT NULL,
  releasedAt INTEGER,
  isCurrent INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS student_connections (
  id TEXT PRIMARY KEY,
  requesterId TEXT NOT NULL,
  receiverId TEXT NOT NULL,
  status TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  FOREIGN KEY (requesterId) REFERENCES student_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (receiverId) REFERENCES student_profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_blocked (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  blockedUserId TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  FOREIGN KEY (userId) REFERENCES student_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (blockedUserId) REFERENCES student_profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_statuses (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  username TEXT NOT NULL,
  displayName TEXT NOT NULL,
  avatarUrl TEXT,
  statusType TEXT NOT NULL,
  content TEXT,
  mediaUrl TEXT,
  mediaType TEXT,
  caption TEXT,
  bgColor TEXT,
  createdAt INTEGER NOT NULL,
  expiresAt INTEGER NOT NULL,
  viewersCount INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS status_views (
  id TEXT PRIMARY KEY,
  statusId TEXT NOT NULL,
  viewerId TEXT NOT NULL,
  viewedAt INTEGER NOT NULL,
  FOREIGN KEY (statusId) REFERENCES student_statuses(id) ON DELETE CASCADE,
  FOREIGN KEY (viewerId) REFERENCES student_profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_privacy_settings (
  userId TEXT PRIMARY KEY,
  hideFollowersFollowing INTEGER DEFAULT 0,
  showOnlineStatus INTEGER DEFAULT 1,
  showLastSeen INTEGER DEFAULT 1,
  readReceipts INTEGER DEFAULT 1,
  updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS saved_links (
  id TEXT PRIMARY KEY,
  userId TEXT,
  originalUrl TEXT NOT NULL,
  cleanedUrl TEXT NOT NULL,
  title TEXT NOT NULL,
  resourceType TEXT NOT NULL,
  customType TEXT,
  domain TEXT NOT NULL,
  faviconUrl TEXT,
  previewImageUrl TEXT,
  description TEXT,
  subjectId TEXT,
  subjectName TEXT,
  category TEXT,
  tags TEXT,
  personalNote TEXT,
  favorite INTEGER DEFAULT 0,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  FOREIGN KEY (subjectId) REFERENCES subjects(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_status_views_unique ON status_views(statusId, viewerId);
CREATE INDEX IF NOT EXISTS idx_subjects_name ON subjects(name);
CREATE INDEX IF NOT EXISTS idx_folders_subjectId ON folders(subjectId);
CREATE INDEX IF NOT EXISTS idx_notes_subjectId ON notes(subjectId);
CREATE INDEX IF NOT EXISTS idx_notes_folderId ON notes(folderId);
CREATE INDEX IF NOT EXISTS idx_notes_title ON notes(title);
CREATE INDEX IF NOT EXISTS idx_pdfs_subjectId ON pdfs(subjectId);
CREATE INDEX IF NOT EXISTS idx_pdfs_title ON pdfs(title);
CREATE INDEX IF NOT EXISTS idx_documents_title ON documents(title);
CREATE INDEX IF NOT EXISTS idx_documents_fileType ON documents(fileType);
CREATE INDEX IF NOT EXISTS idx_documents_folderId ON documents(folderId);
CREATE INDEX IF NOT EXISTS idx_documents_favorite ON documents(favorite);
CREATE INDEX IF NOT EXISTS idx_document_folders_name ON document_folders(name);
CREATE INDEX IF NOT EXISTS idx_diary_events_dueTimestamp ON diary_events(dueTimestamp);
CREATE INDEX IF NOT EXISTS idx_diary_events_dueDate ON diary_events(dueDate);
CREATE INDEX IF NOT EXISTS idx_diary_events_eventType ON diary_events(eventType);
CREATE INDEX IF NOT EXISTS idx_diary_events_subjectId ON diary_events(subjectId);
CREATE INDEX IF NOT EXISTS idx_diary_events_status ON diary_events(status);
CREATE INDEX IF NOT EXISTS idx_diary_attachments_eventId ON diary_attachments(eventId);
CREATE INDEX IF NOT EXISTS idx_timetable_dayOfWeek ON timetable_classes(dayOfWeek);
CREATE INDEX IF NOT EXISTS idx_timetable_startTime ON timetable_classes(startTime);
CREATE INDEX IF NOT EXISTS idx_timetable_subjectId ON timetable_classes(subjectId);
CREATE INDEX IF NOT EXISTS idx_student_profiles_username ON student_profiles(username);
CREATE INDEX IF NOT EXISTS idx_student_profiles_studentId ON student_profiles(publicStudentId);
CREATE INDEX IF NOT EXISTS idx_student_connections_req_rec ON student_connections(requesterId, receiverId);
CREATE INDEX IF NOT EXISTS idx_student_statuses_expiry ON student_statuses(expiresAt);
CREATE INDEX IF NOT EXISTS idx_saved_links_cleanedUrl ON saved_links(cleanedUrl);
CREATE INDEX IF NOT EXISTS idx_saved_links_resourceType ON saved_links(resourceType);
CREATE INDEX IF NOT EXISTS idx_saved_links_subjectId ON saved_links(subjectId);
CREATE INDEX IF NOT EXISTS idx_saved_links_favorite ON saved_links(favorite);
CREATE INDEX IF NOT EXISTS idx_saved_links_createdAt ON saved_links(createdAt);
`;
