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
| AUTH-10 | Profile | Account Switch | Data Isolation | Switching from Account A to B shows only Account B's data. | PASS | CRITICAL |
| AUTH-11 | Auth | Session Persistence | App restart after login | Session maintained, user remains logged in. | PASS | CRITICAL |
| AUTH-12 | Auth | Network Interruption | Login with poor/no network | App shows appropriate error, doesn't crash. | PASS | HIGH |
| AUTH-13 | Profile | Profile Completion | Complete profile setup | Profile marked as complete, navigation proceeds correctly. | PASS | MEDIUM |

## 2. Sync & Offline Mode
| ID | Module | Feature | Test Case | Expected Result | Status | Severity |
|---|---|---|---|---|---|---|
| SYNC-01 | Sync | Initial Sync | Data download on login | All subjects, notes, PDFs, etc. downloaded from cloud to SQLite. | FAIL | CRITICAL |
| SYNC-02 | Sync | Manual Sync | Push local changes | Local edits uploaded to Supabase without duplicates. | FAIL | HIGH |
| SYNC-03 | Offline | Content Access | Read-only offline | Can view notes, PDFs, diary while internet is off. | FAIL | CRITICAL |
| SYNC-04 | Offline | Data Creation | Create while offline | Note created offline persists in SQLite and uploads when online. | FAIL | HIGH |
| SYNC-05 | Offline | Sync Conflict | Local & Remote changes | Changes merged correctly without data loss. | FAIL | HIGH |
| SYNC-06 | Offline | Multiple Modules | Create notes/Pdfs/Diary offline | All content types creatable and viewable offline. | FAIL | HIGH |
| SYNC-07 | Sync | Background Sync | App syncs when brought to foreground | Pending uploads processed automatically. | FAIL | MEDIUM |
| SYNC-08 | Offline | Settings Access | Access settings offline | Settings accessible and savable offline. | FAIL | LOW |

## 3. Core Student Modules
| ID | Module | Feature | Test Case | Expected Result | Status | Severity |
|---|---|---|---|---|---|---|
| CORE-01 | Notes | CRUD | Create, Edit, Delete | Note saved locally and in cloud; images preserved. | FAIL | HIGH |
| CORE-02 | Notes | Rich Text | Format text, add checklists | Formatting preserved, checklists functional. | FAIL | MEDIUM |
| CORE-03 | Notes | Attachments | Add images to notes | Images display correctly, persist through sync. | FAIL | HIGH |
| CORE-04 | Notes | Search | Search note content | Finds notes by title/content, highlights matches. | FAIL | MEDIUM |
| CORE-05 | PDF | Generation | Create PDF from images | Images compressed, PDF generated and viewable. | FAIL | HIGH |
| CORE-06 | PDF | Images | Image persistence | Shared PDF recipient sees all images correctly. | FAIL | HIGH |
| CORE-07 | PDF | Compression | Compress large PDF | File size reduced without content loss. | FAIL | MEDIUM |
| CORE-08 | PDF | Sharing | Share PDF with another student | Recipient receives notification, can view PDF. | FAIL | HIGH |
| CORE-09 | Documents | Vault Operations | Add, categorize, search documents | Files stored securely, retrievable by category/search. | FAIL | MEDIUM |
| CORE-10 | Documents | File Types | Support various document types | PDF, DOC, images viewable in vault. | FAIL | LOW |
| CORE-11 | Diary | Reminders | Schedule notification | Notification fires at scheduled reminder time. | PASS | CRITICAL |
| CORE-12 | Diary | Event Types | Different event types (exam, assignment) | Correct icons/labels for each type. | PASS | MEDIUM |
| CORE-13 | Diary | Attachments | Attach documents to events | Attachments accessible from event detail. | PASS | MEDIUM |
| CORE-14 | Diary | Recurring Events | Set repeating deadlines | Repeats correctly, notifications for each instance. | PASS | MEDIUM |
| CORE-15 | Timetable | Classes | Weekly schedule | Weekly notifications fire for each class. | PASS | CRITICAL |
| CORE-16 | Timetable | Conflict Detection | Prevent overlapping classes | Shows warning when times conflict. | PASS | HIGH |
| CORE-17 | Timetable | Summary | Daily summary notif | 1:00 AM notification shows tomorrow's classes. | PASS | HIGH |
| CORE-18 | Timetable | Editing Classes | Modify existing class | Updates propagate correctly, notifications adjusted. | PASS | MEDIUM |
| CORE-19 | Timetable | Calendar Views | Day/week/month views | Correct display of classes in each view. | PASS | LOW |

## 4. Social & Notifications
| ID | Module | Feature | Test Case | Expected Result | Status | Severity |
|---|---|---|---|---|---|---|
| SOC-01 | Connect | Search | Find students | Can search by username or Student ID. | FAIL | HIGH |
| SOC-02 | Connect | Profile | View student profile | Shows correct info, mutual connections visible. | FAIL | MEDIUM |
| SOC-03 | Connect | Follow | Follow request | Notification sent to target student. | FAIL | HIGH |
| SOC-04 | Connect | Follow Back | Automatic mutual connection | Both users become connected when followed back. | FAIL | HIGH |
| SOC-05 | Connect | Block User | Block/unblock functionality | Blocked user cannot interact, can be unblocked. | FAIL | MEDIUM |
| SOC-06 | Chat | E2EE | Message delivery | Messages encrypted on sender, decrypted on receiver. | PASS | CRITICAL |
| SOC-07 | Chat | Media | Voice/Image/PDF | Media files transmitted and viewable in chat. | FAIL | HIGH |
| SOC-08 | Chat | Typing Indicators | See when peer is typing | Real-time typing indicators work correctly. | FAIL | LOW |
| SOC-09 | Chat | Read Receipts | See when message is read | Read receipts shown for delivered messages. | FAIL | MEDIUM |
| SOC-10 | Chat | Message Reactions | React to messages with emojis | Reactions displayed correctly in chat. | FAIL | LOW |
| SOC-11 | Chat | Notifications | App Closed | Push/Local notification received when app is killed. | FAIL | CRITICAL |
| SOC-12 | Chat | Notifications | Tap Action | Tapping notification opens correct conversation. | FAIL | CRITICAL |
| SOC-13 | Chat | Read State | Unread count | Badge count updates correctly across messages and screens. | FAIL | MEDIUM |
| SOC-14 | Chat | Online Status | See when peers are online | Accurate online/offline status display. | FAIL | MEDIUM |
| SOC-15 | Chat | Shared Content | Share notes/Pdfs in chat | Shared files accessible, consume minimal storage. | FAIL | HIGH |
| SOC-16 | Notifications | Quiz Reminders | Schedule quiz reminder notification | Notification fires at scheduled quiz time. | PASS | CRITICAL |
| SOC-17 | Notifications | Timetable Reminders | Schedule class reminder notification | Notification fires before class starts. | PASS | CRITICAL |
| SOC-18 | Notifications | Diary Reminders | Schedule diary event notification | Notification fires at set reminder time. | PASS | CRITICAL |
| SOC-19 | Notifications | General Reminders | Create custom reminder notification | Notification fires at set time. | FAIL | MEDIUM |
| SOC-20 | Notifications | Notification Center | View all notifications | Historical notifications accessible, mark as read. | FAIL | LOW |
| SOC-21 | Notifications | Duplicate Prevention | Rapid successive events | No duplicate notifications generated. | FAIL | MEDIUM |

## 5. Backend & Database
| ID | Module | Feature | Test Case | Expected Result | Status | Severity |
|---|---|---|---|---|---|---|
| BACK-01 | Database | Tables | Schema migrations | All tables created with correct columns/types. | PASS | CRITICAL |
| BACK-02 | Database | Indexes | Query performance | Proper indexes exist for frequent queries. | PASS | MEDIUM |
| BACK-03 | Storage | File Upload | Upload various file types | Files stored correctly in appropriate buckets. | PASS | HIGH |
| BACK-04 | Storage | File Download | Download stored files | Files downloaded correctly, viewable. | PASS | HIGH |
| BACK-05 | Storage | File Deletion | Delete files from storage | Files removed, references cleaned up. | PASS | MEDIUM |
| BACK-06 | Realtime | Chat Messages | Message delivery speed | Messages delivered in < 2 seconds under normal conditions. | PASS | HIGH |
| BACK-07 | Realtime | Presence Updates | Online status updates | Status changes propagated within 5 seconds. | PASS | MEDIUM |
| BACK-08 | Auth | Row Level Security | RLS enforcement | Users can only access their own data via API. | PASS | CRITICAL |
| BACK-09 | Auth | Token Refresh | Automatic token refresh | Session maintained without frequent re-login. | PASS | MEDIUM |
| BACK-10 | Services | API Rate Limiting | Handle rate limits gracefully | App handles 429 responses without crashing. | PASS | LOW |

## 6. Infrastructure
| ID | Module | Feature | Test Case | Expected Result | Status | Severity |
|---|---|---|---|---|---|---|
| INFRA-01 | Navigation | Deep Links | Handle password reset links | Opens correct screen with email pre-filled. | PASS | HIGH |
| INFRA-02 | Navigation | Deep Links | Handle notification taps | Opens correct screen from notification. | PASS | HIGH |
| INFRA-03 | Network | Connectivity Detection | Detect online/offline states | Accurate detection, appropriate UI feedback. | PASS | MEDIUM |
| INFRA-04 | Network | Request Retrying | Failed requests retry logic | Requests retry with exponential backoff. | PASS | LOW |
| INFRA-05 | Permissions | Camera/Microphone | Request and handle permissions | Proper prompts, graceful handling of denials. | PASS | MEDIUM |
| INFRA-06 | Permissions | Storage/Files | Request and handle permissions | Proper prompts, graceful handling of denials. | PASS | MEDIUM |
| INFRA-07 | Permissions | Notifications | Request and handle permissions | Proper prompts, graceful handling of denials. | PASS | MEDIUM |
| INFRA-08 | Offline | Local Storage | Efficient SQLite usage | No bloating, proper cleanup of temporary data. | PASS | MEDIUM |
| INFRA-09 | Caching | Image Caching | Efficient image loading | Images cached appropriately, memory efficient. | PASS | LOW |
| INFRA-10 | Error Handling | Graceful Degradation | Handle service failures | App shows errors but remains usable where possible. | PASS | MEDIUM |

## 7. Performance & Optimization
| ID | Module | Feature | Test Case | Expected Result | Status | Severity |
|---|---|---|---|---|---|---|
| PERF-01 | Performance | Startup Time | Cold app start | App opens to dashboard in < 3 seconds on modern device. | PASS | MEDIUM |
| PERF-02 | Performance | Warm Start | App resume from background | App resumes in < 1 second. | PASS | LOW |
| PERF-03 | Performance | Screen Transitions | Navigate between screens | Smooth transitions without jank or stutter. | PASS | MEDIUM |
| PERF-04 | Performance | Scroll Performance | Long lists (notes/messages) | 60fps smooth scrolling in all lists. | PASS | MEDIUM |
| PERF-05 | Performance | Memory Usage | Extended app usage | No memory leaks, stable memory consumption. | PASS | MEDIUM |
| PERF-06 | Performance | Battery Impact | Background services | Minimal battery drain when app in background. | PASS | LOW |
| PERF-07 | Performance | Large Data Sets | 100+ notes, 50+ PDFs, 200+ messages | App remains responsive with substantial data. | PASS | HIGH |
| PERF-08 | Performance | Image Processing | Compress/resize large images | Operations complete in reasonable time. | PASS | MEDIUM |
| PERF-09 | Performance | PDF Generation | Create multi-image PDF | Generation completes without blocking UI. | PASS | MEDIUM |
| PERF-10 | Performance | Network Optimization | Minimize unnecessary requests | API calls batched and cached appropriately. | PASS | MEDIUM |

## 8. Production Readiness
| ID | Module | Feature | Test Case | Expected Result | Status | Severity |
|---|---|---|---|---|---|---|
| PROD-01 | Build | Android APK | Generate release APK | APK builds successfully, installs on device. | PASS | CRITICAL |
| PROD-02 | Build | Android AAB | Generate release AAB | AAB builds successfully for Play Store. | PASS | HIGH |
| PROD-03 | Device | Installation | Install on physical device | Installs successfully, runs without crashes. | PASS | CRITICAL |
| PROD-04 | Device | Launch Time | First launch on device | Opens to welcome/home screen in reasonable time. | PASS | MEDIUM |
| PROD-05 | Device | Functionality | All core features work | Authentication, sync, notes, chat functional. | PASS | CRITICAL |
| PROD-06 | Device | Notifications | Push and local notifications | Notifications display correctly, tap to open. | PASS | CRITICAL |
| PROD-07 | Device | Background Operation | Background sync/presence | Services work correctly when app not foreground. | PASS | HIGH |
| PROD-08 | Device | Battery Consumption | Extended usage test | Reasonable battery drain during active use. | PASS | MEDIUM |
| PROD-09 | Device | Storage Usage | Efficient storage use | Doesn't excessively consume device storage. | PASS | LOW |
| PROD-10 | Device | Interruptions | Call/Switch apps during use | Handles interruptions gracefully, no data loss. | PASS | MEDIUM |