# StudentNotes 📚✨

<p align="center">
  <img src="https://img.shields.io/badge/React_Native-0.76-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Expo_SDK-54-000020?style=for-the-badge&logo=expo&logoColor=white" />
  <img src="https://img.shields.io/badge/SQLite-Local_First-003B57?style=for-the-badge&logo=sqlite&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-Cloud_Sync-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Platform-Android_%7C_iOS-green?style=for-the-badge&logo=android&logoColor=white" />
</p>

---

## 📖 Overview

**StudentNotes** is an offline-first, all-in-one student productivity, camera scanning, document management, and academic networking ecosystem. Built with **React Native**, **Expo**, **SQLite**, and **Supabase**, it works completely offline while providing cloud synchronization, classmate discovery, academic scheduling, and document processing.

---

## 🌟 Key Features

### 🎓 1. Student Connect & Academic Networking
- **Classmate Discovery**: Search university classmates by unique `@username` or permanent public Student ID (`STU-XXXXXX`) with real-time uniqueness validation.
- **Connection Management**: Send, receive, accept, decline, or cancel follow requests. View friends list, remove connections, and block/unblock accounts.
- **24-Hour Status Stories**: Share text, color-gradient, photo, and voice status updates that automatically expire after 24 hours. Track unique viewer counts with deduplication.
- **Profile & Identity**: Customize student display name, university name, academic program, current semester, avatar presets, and status visibility.

---

### 📷 2. Document Scanner & Precise Quad Crop
- **Multi-Page Camera Capture**: Capture multiple lecture slides or handwritten notebook pages, or import high-res images from device storage.
- **4-Corner Quadrilateral Cropping**:
  - Independent corner drag handles with live edge boundary calculation.
  - Coordinate scaling ensures 100% crop accuracy across all device screen densities.
  - 90° rotation, aspect ratio correction, and perspective alignment.
- **Page Management**: Reorder, add, or delete scanned pages before saving notes or compiling PDFs.

---

### 📄 3. PDF Studio & Built-in Viewer
- **Create PDF Anywhere**: Generate PDF documents directly from the home dashboard, camera scanner, or specific subject folders.
- **Built-in PDF Viewer**: Smooth page rendering, page navigation, pinch-to-zoom, pan gestures, and full-screen reading mode.
- **Export & Share**: Share PDFs directly via native OS share (WhatsApp, Drive, Gmail, Bluetooth) or save to device storage.

---

### 🛡️ 4. Important Documents Vault
- **Academic Vault**: Securely store university marksheets, fee challans, admission letters, certificates, and ID cards.
- **Multi-Format Support**: Support for PDF, Microsoft Word (`.doc`, `.docx`), PowerPoint (`.ppt`, `.pptx`), and images.
- **Colored Folders & Categories**: Organize files into color-coded folders with quick search and type filters.

---

### 📅 5. Student Diary & Deadlines Tracker
- **Assignment & Exam Tracker**: Organize upcoming assignments, lab reports, quizzes, midterms, and project submissions.
- **Home Widget**: Real-time summary of upcoming deadlines directly on the home dashboard.
- **Priority & Reminders**: Categorize tasks by priority (Urgent, High, Medium, Low) and configure custom alerts.

---

### ⏰ 6. Class Timetable & Schedule
- **Weekly Timetable**: Manage university lectures, instructor details, lecture rooms, and class timings across all weekdays.
- **Live Class Indicator**: Displays the ongoing class with remaining minutes and countdown to the next scheduled lecture.
- **Daily Notifications**: Automatic notifications for upcoming classes and daily morning schedule summaries.

---

### 🔗 7. Saved Links & Resource Hub
- **Categorized Bookmarks**: Save academic research links, YouTube video lectures, coding documentation, and university portal bookmarks.
- **Automated Metadata**: Auto-fetches page title, domain, favicon, and preview thumbnails from public URLs.
- **Subject Filtering**: Tag and associate bookmarks with specific enrolled university courses.

---

### 📦 8. Media Compression Center
- **Image Compression**: Compress camera captures and large study diagrams up to 80% while retaining full readability.
- **Direct Gallery Saving**: Save compressed images directly to the device media gallery.
- **PDF Compression**: Reduce large PDF files for portal submissions and email attachments.

---

### 🗑️ 9. Trash Box & Recovery Center
- **Safe Soft-Deletion**: Deleted notes, PDFs, subjects, folders, and documents move to the Trash Box.
- **One-Tap Restore**: Restore any item back to its original path with metadata intact.
- **Permanent Purge**: Options for single item deletion or emptying all trash with safety dialogs.

---

### 🌓 10. Dynamic Theme & Modern Aesthetics
- **System-Synchronized Themes**: Automatically toggles between Dark Mode and Light Mode matching OS settings, with manual override support.
- **Polished UI**: HSL-tailored colors, smooth animations, and clean status indicators.

---

## 🔒 Security & Data Architecture

- **Auth Identity**: Every user-owned record is strictly scoped to `auth.uid()` (Supabase Auth UUID) via PostgreSQL Row-Level Security (RLS).
- **Multi-Account Isolation**: Stale local caches are cleared upon logout. Logging into Account A restores Account A's cloud data; switching to Account B ensures Account B only accesses their own records.
- **Offline-First Resilience**: All core features operate 100% offline via local SQLite (`expo-sqlite`) and sync automatically when internet connectivity is restored.

---

## 🏗️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend Framework** | [React Native](https://reactnative.dev/) with [Expo SDK 54](https://expo.dev/) |
| **Language** | [TypeScript 5.3](https://www.typescriptlang.org/) |
| **Local Database** | [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) (SQLite 3) |
| **Local Storage** | [expo-file-system](https://docs.expo.dev/versions/latest/sdk/filesystem/), [AsyncStorage](https://react-native-async-storage.github.io/async-storage/) |
| **Cloud Backend** | [Supabase](https://supabase.com/) (PostgreSQL 15, Auth, Storage, Realtime) |
| **Image & Camera** | `expo-camera`, `expo-image-manipulator`, `expo-image-picker`, `expo-media-library` |
| **PDF Generation** | `expo-print` |
| **Navigation** | `@react-navigation/native-stack`, `@react-navigation/bottom-tabs` |
| **Testing** | [Jest](https://jestjs.io/), `ts-jest` |

---

## 📁 Project Structure

```
StudentNotes App/
├── src/
│   ├── components/       # Reusable UI components (buttons, headers, modals, cards)
│   ├── context/          # React Context (AuthContext, ThemeContext)
│   ├── database/         # SQLite schema, migrations, and repository layer
│   │   ├── database.ts
│   │   ├── schema.ts
│   │   └── repositories/
│   ├── hooks/            # Custom hooks (useAuth, useSubjects, useNotes, useConnect)
│   ├── navigation/       # React Navigation stack and tab navigators
│   ├── screens/          # Application screens
│   │   ├── auth/         # Login, Register, Forgot Password, Profile Setup
│   │   ├── connect/      # Student Connect, Search, Profile, Statuses, Friends
│   │   ├── diary/        # Student Diary and Deadline tracking
│   │   ├── documents/    # Important Documents Vault
│   │   ├── links/        # Saved Links hub
│   │   ├── profile/      # User Profile and Settings
│   │   ├── timetable/    # Weekly Class Timetable
│   │   └── ...           # Scanner, Notes, PDFs, Compression, Trash
│   ├── services/         # Business logic (syncService, connectService, notificationService)
│   ├── theme/            # Design tokens, color palettes, spacing
│   ├── types/            # TypeScript data models and navigation types
│   └── utils/            # Helper utilities (id, validation, binary, formatters)
├── supabase/             # Backend migrations and schema scripts
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   └── 002_remove_chat_tables.sql
├── SUPABASE_SCHEMA.sql   # Complete consolidated Supabase PostgreSQL schema
├── __tests__/            # Automated unit and integration test suites
├── app.json              # Expo application manifest
├── package.json          # Dependencies and npm scripts
└── tsconfig.json         # TypeScript configuration
```

---

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Expo Go](https://expo.dev/go) app on mobile or an Android Emulator / iOS Simulator

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/devahmedaqeel/studentnotesapp.git

# Navigate to project directory
cd "StudentNotes App"

# Install project dependencies
npm install
```

### 3. Environment Variables Configuration
Create a `.env` file in the root directory:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run Development Server
```bash
# Start Metro bundler with cache reset
npx expo start -c
```

---

## 🧪 Quality & Automated Testing

```bash
# Run TypeScript compilation check
npm run typecheck

# Run full Jest automated test suite
npm test
```

---

## 📱 Production Build

### Android Release APK (Local Gradle Build)
```powershell
& ".\android\gradlew.bat" -p android assembleRelease
```
> **Output APK:** `android/app/build/outputs/apk/release/app-release.apk`

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
