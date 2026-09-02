# Student Notes App — QA Test Matrix

## 1. Authentication & Profile
| ID | Module | Feature | Test Case | Expected Result | Status | Severity |
|---|---|---|---|---|---|---|
| AUTH-01 | Auth | Google Login | First-time login via Google | Profile created, unique username generated, home screen opens. | PASS | CRITICAL |
| AUTH-02 | Auth | Google Login | Returning login via Google | Session restored, existing profile and username loaded. | PASS | CRITICAL |
| AUTH-03 | Auth | Email Login | Valid credentials | Successful login, session established. | PASS | CRITICAL |
| AUTH-04 | Auth | Email Login | Invalid credentials | Proper error message shown, no login. | PASS | HIGH |
| AUTH-05 | Auth | Signup | New account creation | Account created in Supabase, profile initialized in SQLite & Cloud. | PASS | CRITICAL |
| AUTH-06 | Auth | Logout | Sign out | Session cleared, local user data wiped (except scoped profile), returned to Welcome. | PASS | HIGH |
| AUTH-07 | Auth | Password Reset | Forgot Password flow | Reset email received, deep link works, password updated, login works. | PASS | CRITICAL |
| AUTH-08 | Profile | Username | Username uniqueness | Cannot pick a username already taken by another student. | PASS | HIGH |
| AUTH-09 | Profile | Username | 7-day rule | Cannot change username more than once every 7 days. | PASS | MEDIUM |
| AUTH-10 | Profile | Account Switch | Data Isolation | Switching from Account A to B shows only Account B's data with zero leakage. | PASS | CRITICAL |
| AUTH-11 | Auth | Session Persistence | App restart after login | Session maintained, user remains logged in. | PASS | CRITICAL |
| AUTH-12 | Auth | Network Interruption | Login with poor/no network | App shows appropriate error, doesn't crash. | PASS | HIGH |
| AUTH-13 | Profile | Profile Completion | Complete profile setup | Profile marked as complete, navigation proceeds correctly. | PASS | MEDIUM |

## 2. Sync & Offline Mode
| ID | Module | Feature | Test Case | Expected Result | Status | Severity |
|---|---|---|---|---|---|---|
| SYNC-01 | Sync | Initial Sync | Data download on login | All subjects, notes, PDFs, etc. downloaded from cloud to SQLite. | PASS | CRITICAL |
| SYNC-02 | Sync | Manual Sync | Push local changes | Local edits uploaded to Supabase without duplicates. | PASS | HIGH |
| SYNC-03 | Offline | Content Access | Read-only offline | Can view notes, PDFs, diary, saved links while internet is off. | PASS | CRITICAL |
| SYNC-04 | Offline | Data Creation | Create while offline | Content created offline persists in SQLite and uploads when online. | PASS | HIGH |
| SYNC-05 | Offline | Sync Conflict | Local & Remote changes | Changes merged correctly using latest timestamp without data loss. | PASS | HIGH |
| SYNC-06 | Offline | Multiple Modules | Create notes/PDFs/Diary offline | All content types creatable and viewable offline. | PASS | HIGH |
| SYNC-07 | Sync | Background Sync | App brought to foreground | Pending uploads and profile sync processed automatically. | PASS | MEDIUM |
| SYNC-08 | Offline | Settings Access | Access settings offline | Theme, storage stats, and preferences savable offline. | PASS | LOW |

## 3. Core Academic Modules
| ID | Module | Feature | Test Case | Expected Result | Status | Severity |
|---|---|---|---|---|---|---|
| CORE-01 | Notes | CRUD | Create, Edit, Delete | Note saved locally and in cloud; images preserved. | PASS | HIGH |
| CORE-02 | Notes | Multi-Page Scanner | 4-Corner Quad Crop | Accurate corner handle manipulation and boundary tracking. | PASS | HIGH |
| CORE-03 | Notes | Attachments | Add images to notes | Images display correctly, compress and persist. | PASS | HIGH |
| CORE-04 | Notes | Search | Search note content | Finds notes by title, folder, and subject with fast SQLite indexing. | PASS | MEDIUM |
| CORE-05 | PDF | Generation | Create PDF from images | Images optimized, PDF compiled and viewable. | PASS | HIGH |
| CORE-06 | PDF | Built-in Viewer | Smooth rendering & zoom | Pinch-to-zoom, page navigation, and thumbnail previews work. | PASS | HIGH |
| CORE-07 | PDF | Compression | Compress large PDF | File size reduced cleanly without readability loss. | PASS | MEDIUM |
| CORE-08 | PDF | Export & Sharing | Native OS sharing | Share PDFs via WhatsApp, Gmail, Drive, or Bluetooth. | PASS | HIGH |
| CORE-09 | Documents | Vault Operations | Add, categorize, search documents | Academic files stored securely, retrievable by folder/search. | PASS | MEDIUM |
| CORE-10 | Documents | File Types | Support various document types | PDF, DOC, DOCX, PPT, PPTX, images viewable in vault. | PASS | LOW |
| CORE-11 | Diary | Reminders | Schedule notification | Notification fires at scheduled reminder time. | PASS | CRITICAL |
| CORE-12 | Diary | Event Types | Event categorization (exam, assignment) | Correct icons/labels for each academic type. | PASS | MEDIUM |
| CORE-13 | Diary | Attachments | Attach documents to events | Attachments accessible from event detail. | PASS | MEDIUM |
| CORE-14 | Diary | Recurring Events | Set repeating deadlines | Repeats correctly, notifications for each instance. | PASS | MEDIUM |
| CORE-15 | Timetable | Classes | Weekly schedule | Timetable notifications fire for each scheduled lecture. | PASS | CRITICAL |
| CORE-16 | Timetable | Conflict Detection | Prevent overlapping classes | Shows warning when class timings conflict. | PASS | HIGH |
| CORE-17 | Timetable | Summary | Daily summary notif | Notification displays next day's schedule overview. | PASS | HIGH |
| CORE-18 | Timetable | Editing Classes | Modify existing class | Updates propagate correctly, alerts adjusted. | PASS | MEDIUM |
| CORE-19 | Timetable | Live Class Widget | Real-time class status | Displays active ongoing class and countdown on dashboard. | PASS | MEDIUM |

## 4. Saved Links & Smart URL Optimizer
| ID | Module | Feature | Test Case | Expected Result | Status | Severity |
|---|---|---|---|---|---|---|
| LINK-01 | Saved Links | Smart URL Cleaning | Paste URL with UTM / Ad trackers | Strips tracking query parameters while preserving functional parameters. | PASS | HIGH |
| LINK-02 | Saved Links | Safe Destination | Preserve critical parameters | Parameters like `id`, `v`, `t`, `page`, `search` strictly retained. | PASS | CRITICAL |
| LINK-03 | Saved Links | User Choice | Clean URL vs Keep Original | User can explicitly toggle between cleaned and raw destination. | PASS | HIGH |
| LINK-04 | Saved Links | Preview & Breakdown | Visual comparison card | Displays original URL, clean URL, removed trackers, and preserved data. | PASS | MEDIUM |
| LINK-05 | Saved Links | Custom Link Name | Custom title editing | User-defined custom title is preserved and never overwritten. | PASS | HIGH |
| LINK-06 | Saved Links | Auto-Detection | Detect resource type | Automatically identifies YouTube, GitHub, PDF, Paper, Docs, Courses, AI tools. | PASS | MEDIUM |
| LINK-07 | Saved Links | Open Resource | Tap to open | Opens correct target destination in external browser or application. | PASS | CRITICAL |
| LINK-08 | Saved Links | Search & Filter | Filter by subject & category | Instant search across title, domain, URL, and category tags. | PASS | MEDIUM |

## 5. Student Connect & Social Networking
| ID | Module | Feature | Test Case | Expected Result | Status | Severity |
|---|---|---|---|---|---|---|
| SOC-01 | Connect | Classmate Discovery | Search classmates | Instant search by `@username` or Student ID (`STU-XXXXXX`). | PASS | HIGH |
| SOC-02 | Connect | Public Profile | View student profile | Shows display name, university, program, semester, mutual friends. | PASS | MEDIUM |
| SOC-03 | Connect | Follow Requests | Send follow request | Creates pending connection, sends push notification to target student. | PASS | HIGH |
| SOC-04 | Connect | Accept / Decline | Manage follow requests | Accepting creates mutual connection; declining removes pending request. | PASS | HIGH |
| SOC-05 | Connect | Block / Unblock | Block unwanted user | Blocked user removed from connections and cannot interact. | PASS | MEDIUM |
| SOC-06 | Connect | 24-Hour Status | Post text / photo / voice status | Status visible to connections and expires automatically in 24 hours. | PASS | HIGH |
| SOC-07 | Connect | Status Views | Viewer deduplication | Tracks unique viewer counts without duplicate view logs. | PASS | MEDIUM |
| SOC-08 | Connect | Notifications | Follow request alert | Push notification received when another student requests connection. | PASS | HIGH |

## 6. Backend & Database Security
| ID | Module | Feature | Test Case | Expected Result | Status | Severity |
|---|---|---|---|---|---|---|
| BACK-01 | Database | Tables | Schema migrations | All tables created with correct columns, types, and foreign keys. | PASS | CRITICAL |
| BACK-02 | Database | Indexes | Query performance | Indexes configured for rapid queries across all modules. | PASS | MEDIUM |
| BACK-03 | Storage | File Upload | Upload media & documents | Files stored correctly in isolated user paths in Supabase Storage. | PASS | HIGH |
| BACK-04 | Storage | File Download | Download stored assets | Files downloaded correctly to local device cache. | PASS | HIGH |
| BACK-05 | Storage | File Deletion | Delete storage objects | Assets removed when item is deleted forever from trash. | PASS | MEDIUM |
| BACK-06 | Realtime | Presence | Student online status | Status changes propagated via Supabase Realtime channel. | PASS | MEDIUM |
| BACK-07 | Auth | Row Level Security | Multi-tenant RLS | Strict enforcement of `auth.uid() = user_id` across all tables. | PASS | CRITICAL |
| BACK-08 | Auth | Token Refresh | Auto session refresh | Session tokens renewed without interrupting user workflows. | PASS | MEDIUM |

## 7. Performance & Quality
| ID | Module | Feature | Test Case | Expected Result | Status | Severity |
|---|---|---|---|---|---|---|
| PERF-01 | Performance | Cold Start | App launch time | Launches to interactive dashboard in < 2 seconds. | PASS | HIGH |
| PERF-02 | Performance | Image Compression | Camera photo compression | Reduces raw captures up to 80% without losing text legibility. | PASS | HIGH |
| PERF-03 | Performance | Scroll Performance | Long lists | 60fps smooth scrolling in all list views. | PASS | MEDIUM |
| PERF-04 | Performance | Large Datasets | 100+ notes, 50+ PDFs, 100+ links | App remains responsive with substantial local database records. | PASS | HIGH |
| PERF-05 | Theme | Dark & Light Modes | System theme toggle | Clean UI rendering and palette adaptation across all screens. | PASS | HIGH |
| PERF-06 | Quality | Test Suite | Jest automated suite | 100% test pass rate across all 9 test suites (94/94 passed). | PASS | CRITICAL |

## 8. Build, Release & Packaging
| ID | Module | Feature | Test Case | Expected Result | Status | Severity |
|---|---|---|---|---|---|---|
| BUILD-01 | EAS Build | Cloud APK Build | `eas build -p android --profile preview` | Compiles standalone Android APK with zero build errors. | PASS | CRITICAL |
| BUILD-02 | Asset Validation | PNG Formats | Launcher & splash validation | `expo-doctor` passes all icon and splash image schema checks. | PASS | HIGH |
| BUILD-03 | Prebuild | Native Code Sync | `expo prebuild --platform android` | Synchronizes AndroidManifest permissions, package name, and adaptive icons. | PASS | CRITICAL |
| BUILD-04 | Metro Bundler | JS Hermes Bundle | `expo export --platform android` | Bundles all modules (1657+ modules) into optimized Hermes bytecode (`.hbc`). | PASS | CRITICAL |
| BUILD-05 | Type Safety | TypeScript Check | `tsc --noEmit` | Clean type-check with 0 syntax or type errors across the entire codebase. | PASS | CRITICAL |