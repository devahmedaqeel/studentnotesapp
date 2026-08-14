# StudentNotes 📚

**StudentNotes** is a fast, offline-first mobile note-taking, camera scanning, and PDF management application built with **React Native**, **Expo SDK 54**, **SQLite**, and **Supabase Cloud**.

---

## ✨ Features

- 📱 **Offline-First Productivity**: Create subjects, folders, scan handwritten notes, and generate PDFs without any internet or mandatory account.
- 📷 **Camera Scanner & Image Processing**: Multi-page document scanning, cropping, rotation, and image enhancement.
- 📄 **PDF Generation & Viewer**: Convert scanned note pages into multi-page PDFs with built-in viewer and local file sharing.
- 🔒 **Optional Cloud Backup**: Optional email/password or Google OAuth authentication powered by Supabase.
- 🔄 **Bidirectional Sync**: Safely back up local SQLite notes and files to Supabase Cloud without losing local data upon logout.
- 👤 **Student Profile**: Customize student details (Full Name, Department, University, Semester, Avatar).
- 🔍 **Fast Offline Search**: Instantly search notes, PDFs, subjects, and tags locally.

---

## 🛠️ Quick Start

### 1. Installation
```bash
# Clone repository & install dependencies
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env` and fill in your Supabase credentials:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run Development Server
```bash
# Start Expo Metro server with clear cache
npx expo start -c
```

Open **Expo Go** on your iOS/Android device and scan the displayed QR code.

---

## 🧪 Testing & Verification

```bash
# Run TypeScript Typecheck
npm run typecheck

# Run Unit Test Suite
npm test

# Run Expo Doctor Config Check
npx expo-doctor
```

---

## 📄 Documentation

- [IMPLEMENTATION_AUDIT.md](file:///c:/Users/user/Documents/StudentNotes%20App/IMPLEMENTATION_AUDIT.md) — Codebase audit and architecture inspection.
- [ARCHITECTURE.md](file:///c:/Users/user/Documents/StudentNotes%20App/ARCHITECTURE.md) — Complete hybrid data & layer architecture.
- [SUPABASE_SETUP.md](file:///c:/Users/user/Documents/StudentNotes%20App/SUPABASE_SETUP.md) — Step-by-step database migrations, RLS policies, and storage setup.
