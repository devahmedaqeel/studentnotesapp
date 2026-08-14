# StudentNotes 📚✨

<p align="center">
  <img src="https://img.shields.io/badge/React_Native-0.76-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Expo_SDK-52%2B-000020?style=for-the-badge&logo=expo&logoColor=white" />
  <img src="https://img.shields.io/badge/SQLite-Local_First-003B57?style=for-the-badge&logo=sqlite&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-Cloud_Sync-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/Platform-Android_%7C_iOS-green?style=for-the-badge&logo=android&logoColor=white" />
</p>

---

**StudentNotes** is a fast, modern, all-in-one student productivity, camera scanning, document management, and student networking ecosystem. Built with **React Native**, **Expo**, **SQLite**, and **Supabase Cloud**, it works 100% offline while offering real-time cloud sync, end-to-end encrypted messaging, and academic planning.

---

## 🌟 Key Features

### 💬 1. Student Connect & Real-Time Chatting
- **1-on-1 Student Chat**: End-to-end connected direct messaging for university and college classmates.
- **Voice Notes**: High-fidelity in-chat voice recording and playback.
- **Rich Attachments**: Send scanned handwritten notes, PDF documents, photos, and files directly inside conversations.
- **Student Discovery**: Search classmates by unique `@username` or Student ID (`STU-XXXXXX`) with live availability checking.
- **Follow & Mutual Connections**: Send follow requests with accept/reject approvals. Only mutual connections can message each other for maximum privacy.
- **24-Hour Disappearing Stories / Statuses**: Post text updates, photos, or voice statuses with ring indicators.
- **Clean Inbox**: New accounts start with a 100% clean inbox and status screen (no pre-seeded fake users).

---

### 📷 2. Document Scanner & Precise Crop Tool
- **Multi-Page Scanner**: Capture multiple handwritten lecture pages or import existing photos from gallery.
- **High-Precision 4-Corner Quadrilateral Crop**:
  - Independent corner handles and edge boundary dragging.
  - Live screen layout dimension tracking (100% accurate, zero over-crop/under-crop).
  - Auto-detection and 90° rotation.
- **Page Manager**: Reorder, delete, or add additional pages before finalizing notes or PDFs.
- **Optimization Presets**: Balanced, High Quality, and Compact compression options.

---

### 📄 3. PDF Studio & Direct Creation
- **Create PDF Anywhere**: Generate PDFs directly from HomeScreen or inside specific subjects.
- **Flexible Destinations**: Save directly to a Subject, Folder, or store directly in the **Important Documents Vault** without a subject.
- **Built-in PDF Viewer**: Smooth PDF rendering with zoom, full-screen mode, thumbnail drawer, and fast page navigation.
- **Direct Export & Share**: Share PDFs via WhatsApp, Gmail, Drive, or Bluetooth.

---

### 🛡️ 4. Important Documents Vault
- **Academic Storage Vault**: Store university marksheets, fee receipts, syllabus, identity cards, and certificates.
- **Format Support**: PDF, Microsoft Word (`.doc`, `.docx`), PowerPoint (`.ppt`, `.pptx`), and images.
- **Custom Folders & Color Tags**: Organize files into colored folders.
- **Quick Filters & Search**: Filter by file type (PDF, Word, PPT, Favorites) or search instantly by document name.

---

### 📅 5. Student Diary & Academic Planner
- **Assignment & Exam Tracker**: Organize upcoming assignments, quizzes, midterms, finals, and projects.
- **HomeScreen Widget**: Real-time summary of upcoming deadlines directly on the home dashboard.
- **Priority & Status**: Tag tasks by priority (Urgent, High, Medium, Low) and mark items complete with one tap.

---

### ⏰ 6. Weekly Timetable & Class Schedule
- **Interactive Timetable**: Manage university lectures, instructors, timings, and classroom numbers.
- **Today's Classes Widget**: Instant view of today's schedule and next upcoming lecture.

---

### 📦 7. File Compression Center
- **Image Compression**: Reduce large scanned photo sizes up to 80% with adjustable quality presets while preserving readability.
- **PDF Compression**: Optimize PDF sizes for easy email submission and portal uploads.

---

### 🗑️ 8. Trash Box & Recovery Center
- **Safe Soft-Deletion**: Notes, PDFs, Subjects, Folders, and Documents are safely moved to the Trash Box instead of being deleted permanently.
- **Instant Restore**: Restore any item back to its original location with full metadata intact.
- **Permanent Cleanup**: Single item "Delete Forever" and 1-tap "Empty All Trash" options with safety confirmations.

---

### 🌓 9. Dynamic System Theme & Modern Aesthetics
- **Real-Time System Synchronization**: App dynamically switches between Dark and Light mode as your mobile system settings toggle.
- **Premium UI**: HSL-tailored colors, glassmorphism cards, glowing profile avatar rings, and micro-interactions.

---

### 🔄 10. Hybrid Offline-First Architecture
- **Zero Internet Required**: All notes, subjects, PDFs, and timetable entries save to local SQLite and device storage.
- **Cloud Backup**: Optional Supabase Auth (Email/Password & OTP) with automatic background data sync.
- **Data Protection**: Local files remain 100% safe on device even when logging out.

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [React Native](https://reactnative.dev/) with [Expo SDK](https://expo.dev/) (Managed / Bare Workflow) |
| **Language** | TypeScript |
| **Local Database** | `expo-sqlite` (SQLite 3) |
| **Local File Storage** | `expo-file-system` |
| **Cloud Backend** | [Supabase](https://supabase.com/) (PostgreSQL, Auth, Storage & Realtime) |
| **Image Processing** | `expo-image-manipulator`, `react-native-svg` |
| **PDF Generation** | `expo-print`, `pdf-lib` |
| **Audio Recording** | `expo-av` |
| **Navigation** | `@react-navigation/native-stack`, `@react-navigation/bottom-tabs` |

---

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Android Studio & SDK](https://developer.android.com/studio) (for local Android builds)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/devahmedaqeel/studentnotesapp.git

# Navigate to project directory
cd "StudentNotes App"

# Install dependencies
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run Locally
```bash
# Start Expo Metro Bundler
npx expo start -c
```

---

## 📱 Building the App

### Option A: Local Release APK Build (Fastest)
Run in PowerShell:
```powershell
& ".\android\gradlew.bat" -p android assembleRelease
```
> **Output APK:** `android\app\build\outputs\apk\release\app-release.apk`

### Option B: Cloud EAS Build
```bash
npx eas-cli build --platform android --profile preview
```

---

## 🧪 Quality & Tests
```bash
# Run TypeScript type check
npx tsc --noEmit

# Run unit tests
npm test
```

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).

