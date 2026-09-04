# Google Authentication Configuration & OAuth Setup Guide

This guide details the complete configuration required for production-ready Google Authentication across Android, iOS, and Web for **Student Notes**.

---

## 1. Project Identifiers & Fingerprints

| Property | Value |
| :--- | :--- |
| **Firebase Project ID** | `studentnotes-6a97c` |
| **Firebase Auth Domain** | `studentnotes-6a97c.firebaseapp.com` |
| **Android Package Name** | `com.studentnotes.app` |
| **iOS Bundle Identifier** | `com.studentnotes.app` |
| **URL Scheme** | `studentnotes://` |
| **Debug Keystore SHA-1** | `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` |
| **Debug Keystore SHA-256** | `FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C` |

---

## 2. Firebase Console Setup

1. Open [Firebase Console](https://console.firebase.google.com/project/studentnotes-6a97c/authentication/providers).
2. Navigate to **Build > Authentication > Sign-in method**.
3. Under **Sign-in providers**, click **Google**.
4. Toggle **Enable**.
5. Set your **Project support email**.
6. Under **Web SDK configuration**, note the **Web Client ID** and click **Save**.
7. In the **Settings** tab under **Authorized domains**, ensure the following domains are listed:
   - `studentnotes-6a97c.firebaseapp.com`
   - `studentnotes-6a97c.web.app`
   - `localhost`

---

## 3. Google Cloud Console OAuth 2.0 Client IDs

Open [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials?project=studentnotes-6a97c).

### A. Web Client ID (Required for Web & Expo Auth Session)
1. Click **+ Create Credentials > OAuth client ID**.
2. Select Application type: **Web application**.
3. Name: `Student Notes Web & Expo Client`.
4. **Authorized JavaScript origins**:
   - `https://studentnotes-6a97c.firebaseapp.com`
   - `http://localhost:8081`
5. **Authorized redirect URIs**:
   - `https://studentnotes-6a97c.firebaseapp.com/__/auth/handler`
   - `https://auth.expo.io/@engraqeels-team/student-notes`
   - `studentnotes://`
6. Click **Create** and copy the Client ID.

### B. Android Client ID (For Native Android Builds & APKs)
1. Click **+ Create Credentials > OAuth client ID**.
2. Select Application type: **Android**.
3. Name: `Student Notes Android Debug`.
4. **Package name**: `com.studentnotes.app`
5. **SHA-1 certificate fingerprint**: Add your development / debug keystore SHA-1.
6. **Created Client ID**: Copy the generated client ID to your local private `.env` file.

---

## 4. Production / Release APK Keystore & EAS Build Setup

When building a release APK via EAS (`npm run build:apk` or `eas build -p android --profile preview`):
1. **Production Keystore Fingerprints**: Run `eas credentials` in the terminal to inspect your production keystore fingerprints.
2. **Google Cloud Console Android Client**: Add a second **Android OAuth client ID** in Google Cloud Console using:
   - **Package name**: `com.studentnotes.app`
   - **SHA-1 certificate fingerprint**: The SHA-1 provided by EAS build credentials or your Google Play App Signing key.
3. **Environment Security & EAS Packaging**:
   - Environment secrets are kept in `.env`, which is strictly `.gitignore`d and never exposed on GitHub.
   - For EAS builds, `.easignore` ensures that your local `.env` is bundled securely into the cloud build without publishing secrets to Git.
   - Alternatively, define them securely via EAS Secrets: `npx eas secret:create`.
4. **Android Intent-Filter Callbacks**:
   `android/app/src/main/AndroidManifest.xml` registers both `studentnotes` and `com.studentnotes.app` schemes so browser redirects return smoothly to `MainActivity`.
5. **Direct Code Exchange**:
   Native Android authorization codes are automatically exchanged for ID tokens using `exchangeCodeAsync` via `expo-auth-session`.

---

## 5. Environment Variables Configuration (`.env`)

Configure your private `.env` file (strictly gitignored, never committed to GitHub):

```env
# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-firebase-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-firebase-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-firebase-project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=your-firebase-app-id
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id

# Google OAuth 2.0 Client IDs
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-google-android-client-id.apps.googleusercontent.com
```

> [!SECURITY]
> **Professional Security Rule**: Never commit real API keys, secrets, or Client IDs to public GitHub repositories. Keep them in your local `.env` file and use EAS Secrets or `.easignore` for build-time injection.

---

## 6. Architecture & Flow Summary

```
User taps "Continue with Google"
               │
   ┌───────────┴───────────┐
   ▼                       ▼
Web Platform         Mobile (Android/iOS)
   │                       │
signInWithPopup()    expo-auth-session
(Firebase JS SDK)    (Google ID Token)
   │                       │
   │                 signInWithCredential()
   │                 (GoogleAuthProvider)
   └───────────┬───────────┘
               ▼
      FirebaseUser Verified
               │
    Query / Check Firestore
      `profiles/{uid}`
   ┌───────────┴───────────┐
   ▼                       ▼
New User               Existing User
Create profile with    Preserve all notes,
provider="google" &    categories, folders,
avatarUrl=photoURL     & settings. Merge timestamps.
   └───────────┬───────────┘
               ▼
   Bind Local Data Owner
  (SQLite sync owner check)
               │
   Store Authenticated Session
  (AsyncStorage & local account)
               │
  Navigate to Dashboard (Home)
```
