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

**StudentNotes** is an offline-first, all-in-one student productivity, camera scanning, document management, and academic scheduling ecosystem. Built with **React Native**, **Expo**, **SQLite**, and **Supabase**, it works completely offline while providing automatic cloud synchronization, academic deadline tracking, timetable management, and document processing.

---

## 🌟 Key Features

### 📷 1. Document Scanner & Precise Quad Crop
- **Multi-Page Camera Capture**: Capture multiple lecture slides or handwritten notebook pages, or import high-res images from device storage.
- **4-Corner Quadrilateral Cropping**:
  - Independent corner drag handles with live edge boundary calculation.
  - Coordinate scaling ensures 100% crop accuracy across all device screen densities.
  - 90° rotation, aspect ratio correction, and perspective alignment.
- **Page Management**: Reorder, add, or delete scanned pages before saving notes or compiling PDFs.

---

### 📄 2. PDF Studio & Built-in Viewer
- **Create PDF Anywhere**: Generate PDF documents directly from the home dashboard, camera scanner, or specific subject folders.
- **Built-in PDF Viewer**: Smooth page rendering, page navigation, pinch-to-zoom, pan gestures, and full-screen reading mode.
- **Export & Share**: Share PDFs directly via native OS share (WhatsApp, Drive, Gmail, Bluetooth) or save to device storage.

---

### 🛡️ 3. Important Documents Vault
- **Academic Vault**: Securely store university marksheets, fee challans, admission letters, certificates, and ID cards.
- **Multi-Format Support**: Support for PDF, Microsoft Word (`.doc`, `.docx`), PowerPoint (`.ppt`, `.pptx`), and images.
- **Colored Folders & Categories**: Organize files into color-coded folders with quick search and type filters.

---

### 📅 4. Student Diary & Deadlines Tracker
- **Assignment & Exam Tracker**: Organize upcoming assignments, lab reports, quizzes, midterms, and project submissions.
- **Home Widget**: Real-time summary of upcoming deadlines directly on the home dashboard.
- **Priority & Reminders**: Categorize tasks by priority (Urgent, High, Medium, Low) and configure custom alerts.

---

### ⏰ 5. Class Timetable & Schedule
- **Weekly Timetable**: Manage university lectures, instructor details, lecture rooms, and class timings across all weekdays.
- **Live Class Indicator**: Displays the ongoing class with remaining minutes and countdown to the next scheduled lecture.
- **Daily Notifications**: Automatic notifications for upcoming classes and daily morning schedule summaries.

---

### 🔗 6. Saved Links & Smart URL Optimizer
- **Smart URL Cleaning**: Strips unnecessary marketing and advertising trackers (`utm_*`, `fbclid`, `gclid`, `msclkid`, `si`, `spm`, etc.) while strictly preserving functional parameters (`id`, `v`, `t`, `page`, `search`, `doc`).
- **User Control & Visual Preview**: Choose between `Clean URL (Recommended)` and `Keep Original`, with a real-time comparison breakdown and badge inspection.
- **Categorized Bookmarks**: Save academic research links, YouTube video lectures, coding documentation, and university portal bookmarks.
- **Automated Metadata**: Auto-fetches page title, domain, favicon, and preview thumbnails from public URLs.
- **Subject Filtering**: Tag and associate bookmarks with specific enrolled university courses.

---

### 📦 7. Media Compression Center
- **Image Compression**: Compress camera captures and large study diagrams up to 80% while retaining full readability.
- **Direct Gallery Saving**: Save compressed images directly to the device media gallery.
- **PDF Compression**: Reduce large PDF files for portal submissions and email attachments.

---

### 🗑️ 8. Trash Box & Recovery Center
- **Safe Soft-Deletion**: Deleted notes, PDFs, subjects, folders, and documents move to the Trash Box.
- **One-Tap Restore**: Restore any item back to its original path with metadata intact.
- **Permanent Purge**: Options for single item deletion or emptying all trash with safety dialogs.

---

### 🌓 9. Dynamic Theme & Modern Aesthetics
- **System-Synchronized Themes**: Automatically toggles between Dark Mode and Light Mode matching OS settings, with manual override support (Light, Dark, System).
- **Polished UI**: HSL-tailored colors, smooth animations, and clean status indicators.

---

## 🔒 Security & Data Architecture

- **Auth Identity**: Every user-owned record is strictly scoped to `auth.uid()` (Supabase Auth UUID) via PostgreSQL Row-Level Security (RLS).
- **Multi-Account Isolation**: Stale local caches are cleared upon logout. Logging into Account A restores Account A's cloud data; switching to Account B ensures Account B only accesses their own records.
- **Local-First SQLite**: Full offline capability with encrypted offline fallback profile support.
- **Terms & Privacy Consent**: Stored persistently on device and shown only on initial first launch.

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or newer)
- npm or yarn
- Expo CLI
- Physical Android/iOS device or Simulator

### Installation

```bash
# 1. Clone repository
git clone https://github.com/devahmedaqeel/studentnotesapp.git
cd studentnotesapp

# 2. Install dependencies
npm install

# 3. Configure environment variables (.env)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# 4. Start local development server
npm start
```

### Running Tests

```bash
# Run unit & integration test suites
npm test

# Run TypeScript type verification
npm run typecheck
```

---

## 📱 Tech Stack

- **Framework**: React Native 0.76 with Expo SDK 54
- **Language**: TypeScript 5.3
- **Local Database**: SQLite (`expo-sqlite`)
- **Backend / Auth**: Supabase (PostgreSQL with Row Level Security)
- **Navigation**: React Navigation (Native Stack & Bottom Tabs)
- **Styling**: Vanilla Custom Design System with Dark & Light Themes
- **Media**: `expo-camera`, `expo-image-manipulator`, `expo-print`, `expo-sharing`, `expo-media-library`

---

## 📄 License

This project is licensed under the MIT License.
