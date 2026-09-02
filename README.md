# StudentNotes 📚✨

<p align="center">
  <img src="https://img.shields.io/badge/React_Native-0.81.5-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Expo_SDK-54.0.0-000020?style=for-the-badge&logo=expo&logoColor=white" />
  <img src="https://img.shields.io/badge/SQLite-Local_First-003B57?style=for-the-badge&logo=sqlite&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-Cloud_Sync-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/Firebase-Auth_&_Storage-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" />
  <img src="https://img.shields.io/badge/EAS_Build-Android_APK-000020?style=for-the-badge&logo=expo&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Platform-Android_%7C_iOS-green?style=for-the-badge&logo=android&logoColor=white" />
</p>

---

## 📖 Overview

**StudentNotes** is an enterprise-grade, offline-first student productivity, document scanner, academic scheduling, and learning resource ecosystem. Built with **React Native (0.81.5)**, **Expo SDK 54**, **SQLite**, **Supabase**, and **Firebase**, it is designed to work seamlessly with zero internet connectivity while offering seamless multi-cloud synchronization, deadline alerts, class schedule management, and instant standalone APK generation.

---

## 🌟 Core Features & Modules

### 📷 1. Document Scanner & High-Precision Quad Crop
* **Multi-Page Scanning**: Capture lectures, whiteboard sessions, or handwritten notebook pages consecutively, or import from gallery.
* **4-Corner Quadrilateral Crop**:
  * Independent drag handles with real-time bounding boundary calculation.
  * Coordinate normalization ensures 100% crop accuracy across all screen densities.
  * Aspect ratio correction, 90° rotation, and perspective alignment.
* **Page Management**: Reorder, add, or delete scanned pages before compiling into notes or PDFs.

---

### 📄 2. PDF Studio & Built-in Viewer
* **Create PDF Anywhere**: Generate PDFs directly from the camera scanner, home dashboard, or specific subject folders.
* **Built-in PDF Viewer**: Smooth page rendering, page navigation, pinch-to-zoom, pan gestures, and full-screen reading mode.
* **Export & Share**: Share generated PDFs via native OS sheet (WhatsApp, Google Drive, Email, Bluetooth) or save to local storage.

---

### 🛡️ 3. Academic Documents Vault
* **Encrypted Student Vault**: Securely store university marksheets, fee challans, admission cards, roll-number slips, and certificates.
* **Multi-Format Support**: Native preview for PDF, Microsoft Word (`.doc`, `.docx`), PowerPoint (`.ppt`, `.pptx`), and high-res images.
* **Color-Coded Folders**: Organize documents into custom color-coded categories with instant search and file type filtering.

---

### 📅 4. Student Diary & Deadlines Tracker
* **Assignment & Exam Countdown**: Track upcoming assignments, quizzes, midterms, lab evaluations, and project milestones.
* **Real-Time Badges**: Dynamic countdown badges (`Due Today`, `Due Tomorrow`, `X days left`, `OVERDUE`) with color indicators.
* **Push Notifications**: Configurable alerts and reminder notifications scheduled locally using `expo-notifications`.

---

### ⏰ 5. Class Timetable & Schedule Management
* **Weekly Schedule Matrix**: Manage daily university lectures, instructor names, room numbers, and timings across weekdays.
* **Live Class Indicator**: Displays currently ongoing lecture with elapsed/remaining minutes and countdown to the next class.
* **Morning Briefing**: Daily morning summary notifications alerting students to their schedule.

---

### 🔗 6. Saved Links & Smart URL Optimizer
* **Smart URL Cleaning**: Automatically detects and strips invasive tracking and advertising parameters (`utm_*`, `fbclid`, `gclid`, `msclkid`, `si`, `spm`, etc.) while strictly preserving functional parameters (`id`, `v`, `t`, `page`, `search`, `doc`).
* **User Control**: Choose between `Clean URL (Recommended)` and `Keep Original` with real-time visual breakdown.
* **Auto-Metadata Extraction**: Automatically fetches page titles, domains, favicons, and preview thumbnails from public URLs.
* **Subject Categorization**: Tag and associate research links with enrolled courses.

---

### 📦 7. Media Compression Center
* **Image Compression**: Compress large diagrams and lecture photos up to 80% with zero loss of document text readability.
* **Direct Gallery Saving**: Save compressed images directly to the device media gallery (`expo-media-library`).
* **PDF Compression**: Reduce large multi-page PDF documents for submission to university portals and email attachments.

---

### 🗑️ 8. Trash Box & Recovery Center
* **Safe Soft-Deletion**: Deleted notes, PDFs, subjects, folders, and documents move to the Trash Box.
* **Atomic Recovery**: 1-tap restore brings records and physical assets back to their exact original locations.
* **Permanent Purge**: Empty trash or permanently delete individual items with confirmation dialogs.

---

### 🌓 9. Dynamic Themes & Design System
* **Auto System-Sync**: Seamlessly switches between Dark Mode and Light Mode following device settings, with manual override (Light / Dark / System).
* **Premium HSL Color Tokens**: Dark theme (#0B0F19 background) with rich indigo accents and high-contrast typography.

---

### 🔐 10. Hybrid Auth & Multi-Account Isolation
* **Hybrid Authentication**: Supports both **Firebase Auth** and **Supabase Auth** (Email/Password, Google OAuth).
* **Guest / Offline Mode**: Instant offline access with local fallback profiles.
* **Strict Multi-Account Isolation**: Local caches are purged upon logout to prevent cross-account data leaks. Logging in restores cloud data for that authenticated account.

---

## 🏗️ Project Architecture

```
StudentNotes App/
├── assets/                  # App launcher icons, adaptive icons, and splash screen (PNG)
├── android/                 # Native Android project configuration (Gradle, Manifest, NDK)
├── src/
│   ├── components/          # Reusable UI components (buttons, inputs, bottom sheets, pickers)
│   │   ├── common/          # Universal UI elements (ConfirmDialog, SwipeableRow, etc.)
│   │   ├── diary/           # Diary & deadline cards
│   │   ├── notes/           # Note cards and thumbnail previewers
│   │   ├── pdf/             # PDF cards and export widgets
│   │   └── subjects/        # Subject and folder cards
│   ├── context/             # React Contexts (AuthContext, NetworkContext, ThemeContext)
│   ├── database/            # SQLite initialization, schema migrations, and repositories
│   │   └── repositories/    # Note, Subject, Folder, Diary, Link, and Trash repositories
│   ├── hooks/               # Custom hooks (useAuth, useDiary, useDocuments, etc.)
│   ├── navigation/          # React Navigation (RootNavigator, TabNavigator)
│   ├── screens/             # Application screen views
│   │   ├── auth/            # Login, Register, ForgotPassword, Terms screens
│   │   ├── diary/           # CreateDiaryEvent, DiaryDetails screens
│   │   ├── links/           # SavedLinksScreen, SaveLinkScreen
│   │   ├── profile/         # ProfileSetup, EditProfile screens
│   │   └── timetable/       # TimetableScreen, AddClassScreen
│   ├── services/            # Business logic & APIs (Firebase, Supabase, PDF, Image, Sync)
│   ├── theme/               # Color tokens, typography, and spacing constants
│   └── types/               # TypeScript interface definitions
├── __tests__/               # Automated unit & integration tests (Jest)
├── app.json                 # Expo project configuration & plugins
├── eas.json                 # EAS Build configurations (Preview APK & Production)
├── package.json             # Dependencies and build scripts
└── tsconfig.json            # TypeScript compiler configuration
```

---

## ⚡ Standalone Android APK Build (EAS)

This project is pre-configured with Expo Application Services (EAS) to build standalone Android APKs directly in the cloud:

* **EAS Project ID**: `26b9a18b-db4f-4ee8-8e48-dc2cba7509a4`
* **Account / Team**: `@engraqeels-team/student-notes`
* **Live Cloud Build**: [View on Expo EAS](https://expo.dev/accounts/engraqeels-team/projects/student-notes/builds/40d39695-5837-42df-bd14-cdbbef3dd8fd)

### Triggering an APK Build

To trigger an APK build directly from your terminal:

```bash
# Generate standalone Android APK
npm run build:apk

# Or directly with EAS CLI
npx eas build -p android --profile preview
```

---

## 🚀 Getting Started & Local Development

### Prerequisites
* Node.js (v18 or newer)
* npm or yarn
* Expo CLI & EAS CLI (`npm install -g eas-cli`)
* Android device or emulator with Expo Go

### Installation

```bash
# 1. Clone repository
git clone https://github.com/devahmedaqeel/studentnotesapp.git
cd studentnotesapp

# 2. Install dependencies
npm install

# 3. Configure environment variables (.env)
cp .env.example .env

# 4. Start local development server
npm start
```

### Environment Variables (`.env`)

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://ymtufelczpyiinlwqhbh.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyAJfkbdk-TXyorPutYGTfIKoIYsBMRVzj8
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=studentnotes-6a97c.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=studentnotes-6a97c
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=studentnotes-6a97c.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=985785236495
EXPO_PUBLIC_FIREBASE_APP_ID=1:985785236495:web:249c32fcac96a792afb77a
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=G-4T05VTNLBL
```

---

## 🧪 Testing & Validation

All tests and type validations run in CI/CD and local environments:

```bash
# Run unit & integration test suites (9 test suites, 94 tests)
npm test

# Run TypeScript type verification
npm run typecheck

# Verify project health and dependency compatibility
npx expo-doctor
```

---

## 📱 Tech Stack Summary

| Technology | Purpose |
| :--- | :--- |
| **React Native 0.81.5** | Core mobile application framework |
| **Expo SDK 54** | Managed ecosystem & native APIs |
| **TypeScript 5.3** | Static typing & enterprise reliability |
| **Expo SQLite** | Offline-first local database storage |
| **Supabase** | Cloud data synchronization & PostgreSQL RLS |
| **Firebase** | Authentication & cloud storage backup |
| **React Navigation v7** | Native Stack and Tab routing |
| **EAS Build** | Cloud-based Android APK generation |
| **pdf-lib & expo-print** | High-performance PDF generation & manipulation |

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
