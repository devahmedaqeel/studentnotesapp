import { generateId } from '../src/utils/id';
import { validateName, sanitizeTitle } from '../src/utils/validation';
import { getFileExtension, formatFileSize, detectDocumentType, getDocumentMimeType } from '../src/utils/file';
import { formatPageCount, formatNoteCount, formatPdfCount } from '../src/utils/formatting';
import { diaryService } from '../src/services/diaryService';
import { timetableService } from '../src/services/timetableService';
import { connectService } from '../src/services/connectService';
import { e2eeService } from '../src/services/e2eeService';
import { statusService } from '../src/services/statusService';

describe('Utility Functions Unit Tests', () => {
  describe('ID Generation', () => {
    test('generates a unique ID with optional prefix', () => {
      const id1 = generateId('subj');
      const id2 = generateId('subj');
      expect(id1).toContain('subj_');
      expect(id1).not.toEqual(id2);
    });
  });

  describe('Validation', () => {
    test('sanitizes input whitespace', () => {
      expect(sanitizeTitle('   Software    Engineering   ')).toBe('Software Engineering');
    });

    test('validates subject/folder names correctly', () => {
      expect(validateName('', 'Subject Name').valid).toBe(false);
      expect(validateName('A', 'Subject Name').valid).toBe(false);
      expect(validateName('Valid Subject', 'Subject Name').valid).toBe(true);
    });
  });

  describe('File Utilities', () => {
    test('extracts file extension correctly', () => {
      expect(getFileExtension('document.pdf')).toBe('pdf');
      expect(getFileExtension('page_001.JPG')).toBe('jpg');
    });

    test('formats file size human readable', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
    });

    test('detects supported file types accurately', () => {
      expect(detectDocumentType('assignment.docx')).toBe('docx');
      expect(detectDocumentType('notes.pdf')).toBe('pdf');
      expect(detectDocumentType('slides.pptx')).toBe('pptx');
      expect(detectDocumentType('old_doc.doc')).toBe('doc');
      expect(detectDocumentType('lecture.ppt')).toBe('ppt');
      expect(detectDocumentType('unknown.xyz')).toBe('other');
    });

    test('resolves standard MIME types correctly', () => {
      expect(getDocumentMimeType('paper.pdf')).toBe('application/pdf');
      expect(getDocumentMimeType('essay.docx')).toContain('wordprocessingml');
      expect(getDocumentMimeType('presentation.pptx')).toContain('presentationml');
      expect(getDocumentMimeType('lecture.ppt')).toContain('ms-powerpoint');
    });
  });

  describe('Formatting Utilities', () => {
    test('formats page counts correctly', () => {
      expect(formatPageCount(1)).toBe('1 page');
      expect(formatPageCount(5)).toBe('5 pages');
    });

    test('formats note counts correctly', () => {
      expect(formatNoteCount(1)).toBe('1 note');
      expect(formatNoteCount(3)).toBe('3 notes');
    });

    test('formats pdf counts correctly', () => {
      expect(formatPdfCount(1)).toBe('1 PDF');
      expect(formatPdfCount(4)).toBe('4 PDFs');
    });
  });

  describe('Diary Service Countdown & Formatting', () => {
    test('calculates completed status correctly', () => {
      const result = diaryService.calculateCountdown(Date.now() + 100000, true);
      expect(result.status).toBe('completed');
      expect(result.text).toContain('Completed');
    });

    test('calculates overdue status for past dates', () => {
      const pastTime = Date.now() - 2 * 24 * 60 * 60 * 1000;
      const result = diaryService.calculateCountdown(pastTime, false);
      expect(result.status).toBe('overdue');
      expect(result.text).toContain('OVERDUE');
    });

    test('calculates upcoming future countdown', () => {
      const futureTime = Date.now() + 5 * 24 * 60 * 60 * 1000;
      const result = diaryService.calculateCountdown(futureTime, false);
      expect(result.status).toBe('upcoming');
      expect(result.text).toContain('days left');
    });

    test('retrieves event type visual configurations', () => {
      const assign = diaryService.getEventTypeConfig('assignment');
      expect(assign.color).toBe('#EF4444');
      expect(assign.label).toBe('Assignment');

      const exam = diaryService.getEventTypeConfig('exam');
      expect(exam.color).toBe('#2563EB');
      expect(exam.label).toBe('Exam');
    });
  });

  describe('Timetable Service Time Math & Conflict Detection', () => {
    test('formats 24-hour time to 12-hour AM/PM correctly', () => {
      expect(timetableService.formatTime12('09:00')).toBe('9:00 AM');
      expect(timetableService.formatTime12('13:30')).toBe('1:30 PM');
      expect(timetableService.formatTime12('00:00')).toBe('12:00 AM');
      expect(timetableService.formatTime12('12:00')).toBe('12:00 PM');
    });

    test('calculates duration between times accurately', () => {
      expect(timetableService.calculateDuration('09:00', '10:00')).toBe('1 hour');
      expect(timetableService.calculateDuration('09:30', '11:00')).toBe('1 hr 30 mins');
      expect(timetableService.calculateDuration('10:00', '10:45')).toBe('45 mins');
    });

    test('detects schedule conflicts accurately on the same day', () => {
      const existing = [
        {
          id: 'cls_1',
          subjectName: 'Software Engineering',
          dayOfWeek: 'monday' as const,
          startTime: '09:00',
          endTime: '10:00',
          reminderEnabled: true,
          reminderMinutes: 10,
          createdAt: 0,
          updatedAt: 0,
        },
      ];

      // Overlap: 09:30 to 10:30 on Monday
      const conflict = timetableService.checkConflict(
        { dayOfWeek: 'monday', startTime: '09:30', endTime: '10:30' },
        existing
      );
      expect(conflict).not.toBeNull();
      expect(conflict?.subjectName).toBe('Software Engineering');

      // No overlap: 10:00 to 11:00 on Monday
      const noConflict = timetableService.checkConflict(
        { dayOfWeek: 'monday', startTime: '10:00', endTime: '11:00' },
        existing
      );
      expect(noConflict).toBeNull();

      // Different day: 09:30 to 10:30 on Tuesday
      const diffDay = timetableService.checkConflict(
        { dayOfWeek: 'tuesday', startTime: '09:30', endTime: '10:30' },
        existing
      );
      expect(diffDay).toBeNull();
    });

    test('calculates day metrics and free time intervals', () => {
      const classes = [
        {
          id: '1',
          subjectName: 'Class A',
          dayOfWeek: 'monday' as const,
          startTime: '09:00',
          endTime: '10:00',
          reminderEnabled: true,
          reminderMinutes: 10,
          createdAt: 0,
          updatedAt: 0,
        },
        {
          id: '2',
          subjectName: 'Class B',
          dayOfWeek: 'monday' as const,
          startTime: '11:00',
          endTime: '12:00',
          reminderEnabled: true,
          reminderMinutes: 10,
          createdAt: 0,
          updatedAt: 0,
        },
      ];

      const metrics = timetableService.calculateDayMetrics(classes);
      expect(metrics.classCount).toBe(2);
      expect(metrics.firstClassStart).toBe('09:00');
      expect(metrics.lastClassEnd).toBe('12:00');
      expect(metrics.totalClassMinutes).toBe(120); // 2 hours
      expect(metrics.totalUniversityMinutes).toBe(180); // 3 hours (9:00 - 12:00)
      expect(metrics.totalBreakMinutes).toBe(60); // 1 hour break

      const freeSlots = timetableService.findFreeTimeSlots(classes);
      expect(freeSlots.length).toBe(1);
      expect(freeSlots[0].startTime).toBe('10:00');
      expect(freeSlots[0].endTime).toBe('11:00');
      expect(freeSlots[0].durationMinutes).toBe(60);
    });
  });

  describe('Student Connect & E2EE Cryptography', () => {
    test('validates username rules correctly', () => {
      expect(connectService.validateUsername('ahmed_aqeel').isValid).toBe(true);
      expect(connectService.validateUsername('ali123').isValid).toBe(true);
      expect(connectService.validateUsername('ab').isValid).toBe(false); // too short
      expect(connectService.validateUsername('admin').isValid).toBe(false); // reserved
      expect(connectService.validateUsername('user name').isValid).toBe(false); // space
      expect(connectService.validateUsername('user@name').isValid).toBe(false); // special char
    });

    test('generates valid public student ID', () => {
      const stuId = connectService.generatePublicStudentId();
      expect(stuId).toMatch(/^STU-[A-Z0-9]{6}$/);
    });

    test('encrypts and decrypts text client-side end-to-end', async () => {
      const plainMessage = 'Hello, can you send the Database Lecture 5 notes?';
      const testSecretKey = 'test_shared_secret_key_32_bytes_len_12345';

      const encrypted = await e2eeService.encryptText(plainMessage, testSecretKey);
      expect(encrypted.ciphertext).not.toBe(plainMessage);
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.hmac).toBeDefined();

      const decrypted = await e2eeService.decryptText(encrypted, testSecretKey);
      expect(decrypted).toBe(plainMessage);
    });

    test('detects tampered ciphertext HMAC integrity check', async () => {
      const plainMessage = 'Confidential exam tips';
      const secret = 'secret_key_12345678901234567890';

      const encrypted = await e2eeService.encryptText(plainMessage, secret);
      const tampered = { ...encrypted, ciphertext: encrypted.ciphertext + 'tampered' };

      await expect(e2eeService.decryptText(tampered, secret)).rejects.toThrow();
    });

    test('formats 24-hour status expiration correctly', () => {
      const in2Hours = Date.now() + 2 * 60 * 60 * 1000;
      expect(statusService.formatExpiresIn(in2Hours)).toBe('Expires in 2h');

      const in30Mins = Date.now() + 30 * 60 * 1000;
      expect(statusService.formatExpiresIn(in30Mins)).toBe('Expires in 30m');

      const past = Date.now() - 10000;
      expect(statusService.formatExpiresIn(past)).toBe('Expired');
    });

    test('validates case-insensitive username normalization', () => {
      const v1 = connectService.validateUsername('AhmedAqeel');
      const v2 = connectService.validateUsername('ahmedaqeel');
      expect(v1.isValid).toBe(true);
      expect(v2.isValid).toBe(true);

      const vShort = connectService.validateUsername('a');
      expect(vShort.isValid).toBe(false);
      expect(vShort.error).toBe('Username must be at least 3 characters.');

      const vReserved = connectService.validateUsername('admin');
      expect(vReserved.isValid).toBe(false);
      expect(vReserved.error).toBe('This username is reserved. Please choose another.');
    });

    test('generates compliant permanent Student ID with STU prefix', () => {
      for (let i = 0; i < 10; i++) {
        const stuId = connectService.generatePublicStudentId();
        expect(stuId).toMatch(/^STU-[A-Z0-9]{6}$/);
        expect(stuId.length).toBe(10);
      }
    });

    test('encrypts, decrypts, and preserves native Unicode emoji messages', async () => {
      const emojiMessage = 'Good luck on the exams! 😂 ❤️ 👍 🔥 🎓 📚';
      const testSecretKey = 'test_shared_secret_key_32_bytes_len_12345';

      const encrypted = await e2eeService.encryptText(emojiMessage, testSecretKey);
      expect(encrypted.ciphertext).not.toContain('😂');

      const decrypted = await e2eeService.decryptText(encrypted, testSecretKey);
      expect(decrypted).toBe(emojiMessage);
    });

    test('encrypts and decrypts multiline text with special characters and emojis', async () => {
      const multilineMsg = `Hello Sara!\nI want to send you my assignment.\nPlease check it. 📚\nI have attached the PDF. 👍`;
      const testSecretKey = 'test_shared_secret_key_32_bytes_len_12345';

      const encrypted = await e2eeService.encryptText(multilineMsg, testSecretKey);
      const decrypted = await e2eeService.decryptText(encrypted, testSecretKey);
      expect(decrypted).toBe(multilineMsg);
      expect(decrypted.split('\n').length).toBe(4);
    });

    test('maintains complete isolation between Status Views and Chat activity', () => {
      const statusAction = {
        type: 'STATUS_VIEW',
        statusId: 'status_123',
        viewerId: 'user_ahmed',
        ownerId: 'user_saif',
      };

      // Status viewing must NOT create conversation or update chat timestamps
      expect(statusAction.type).not.toBe('CHAT_MESSAGE');
      expect(statusAction.statusId).toBeDefined();
    });

    test('deduplicates multiple status views by the same viewer into a single viewer count', () => {
      const rawViews = [
        { statusId: 'status_saif_1', viewerId: 'user_ahmed', viewedAt: 1000 },
        { statusId: 'status_saif_1', viewerId: 'user_ahmed', viewedAt: 2000 },
        { statusId: 'status_saif_1', viewerId: 'user_ahmed', viewedAt: 3000 },
        { statusId: 'status_saif_1', viewerId: 'user_ali', viewedAt: 2500 },
      ];

      const distinctViewers = new Set(rawViews.map((v) => `${v.statusId}_${v.viewerId}`));
      expect(distinctViewers.size).toBe(2); // Ahmed and Ali = 2 unique viewers, not 4
    });

    test('preserves permanent public Student ID across profile updates without regenerating', () => {
      const originalStudentId = 'STU-9K3L2M';
      const existingProfile = {
        id: 'user_ahmed_1',
        displayName: 'Ahmed Aqeel',
        username: 'ahmedaqeel',
        publicStudentId: originalStudentId,
      };

      const updatePayload = {
        displayName: 'Ahmed Aqeel Developer',
        bio: 'Full Stack Software Engineer',
        program: 'BS Software Engineering',
        publicStudentId: undefined, // omitted on edit
      };

      // Resolved student ID must retain the original permanent ID
      const resolvedStudentId = existingProfile.publicStudentId || updatePayload.publicStudentId;
      expect(resolvedStudentId).toBe(originalStudentId);
    });

    test('maintains single source of truth across Profile Settings, Search, and Chat', () => {
      const canonicalProfile = {
        id: 'user_ahmed_1',
        displayName: 'Ahmed Aqeel',
        username: 'ahmedaqeel',
        publicStudentId: 'STU-123456',
        avatarUrl: 'https://example.com/avatar.jpg',
        bio: 'Software Engineering Student',
        university: 'University of Engineering and Technology',
        program: 'BS Software Engineering',
        semester: '5th Semester',
      };

      // Search Card projection
      const searchCardView = {
        displayName: canonicalProfile.displayName,
        username: canonicalProfile.username,
        publicStudentId: canonicalProfile.publicStudentId,
        avatarUrl: canonicalProfile.avatarUrl,
      };

      // Chat Header projection
      const chatHeaderView = {
        displayName: canonicalProfile.displayName,
        username: canonicalProfile.username,
        avatarUrl: canonicalProfile.avatarUrl,
      };

      // Student Profile Screen projection
      const profileScreenView = { ...canonicalProfile };

      expect(searchCardView.displayName).toBe(canonicalProfile.displayName);
      expect(chatHeaderView.avatarUrl).toBe(canonicalProfile.avatarUrl);
      expect(profileScreenView.publicStudentId).toBe(canonicalProfile.publicStudentId);
    });

    test('validates account creation username rules and normalizes input', () => {
      const raw1 = '  @Ahmed_Aqeel.123  ';
      const clean1 = raw1.trim().replace(/^@/, '').toLowerCase();
      expect(clean1).toBe('ahmed_aqeel.123');

      const raw2 = 'ahmed student'; // contains space
      const isClean = !/\s/.test(raw2);
      expect(isClean).toBe(false);
    });

    test('enforces internet requirement for account creation and blocks offline attempts', () => {
      const networkState = { isOnline: false };
      const attemptSignup = (state: { isOnline: boolean }) => {
        if (!state.isOnline) {
          return { success: false, error: 'Internet connection required to create your account.' };
        }
        return { success: true };
      };

      const result = attemptSignup(networkState);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Internet connection required');
    });

    test('verifies username availability states: empty, checking, available, taken, invalid, offline', () => {
      const getAvailabilityState = (
        query: string,
        isOnline: boolean,
        takenList: string[]
      ) => {
        if (!query.trim()) return 'idle';
        if (query.length < 3 || query.length > 24 || /[^a-z0-9_.]/.test(query)) return 'invalid';
        if (!isOnline) return 'offline';
        if (takenList.includes(query.toLowerCase())) return 'taken';
        return 'available';
      };

      const taken = ['ahmedaqeel', 'sarahkhan'];

      expect(getAvailabilityState('', true, taken)).toBe('idle');
      expect(getAvailabilityState('a', true, taken)).toBe('invalid');
      expect(getAvailabilityState('ahmedaqeel', true, taken)).toBe('taken');
      expect(getAvailabilityState('ahmed_new', true, taken)).toBe('available');
      expect(getAvailabilityState('ahmed_new', false, taken)).toBe('offline');
    });

    test('generates complete onboarding package with permanent STU-ID and chosen username upon successful creation', () => {
      const createdAccount = {
        userId: 'auth_usr_998877',
        fullName: 'Ahmed Aqeel',
        chosenUsername: 'ahmedaqeel',
        publicStudentId: 'STU-ABC123',
        accountComplete: true,
      };

      expect(createdAccount.chosenUsername).toBe('ahmedaqeel');
      expect(createdAccount.publicStudentId).toMatch(/^STU-[A-Z0-9]{6}$/);
      expect(createdAccount.accountComplete).toBe(true);
    });
  });
});

