import { generateId } from '../src/utils/id';
import { validateName, sanitizeTitle } from '../src/utils/validation';
import { getFileExtension, formatFileSize, detectDocumentType, getDocumentMimeType } from '../src/utils/file';
import { formatPageCount, formatNoteCount, formatPdfCount } from '../src/utils/formatting';
import { diaryService } from '../src/services/diaryService';
import { timetableService } from '../src/services/timetableService';
import { base64ToUint8Array, uint8ArrayToBase64, base64ToArrayBuffer } from '../src/utils/binary';

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
    test('formats page, note, and PDF counts accurately', () => {
      expect(formatPageCount(1)).toBe('1 page');
      expect(formatPageCount(5)).toBe('5 pages');
      expect(formatNoteCount(1)).toBe('1 note');
      expect(formatNoteCount(10)).toBe('10 notes');
      expect(formatPdfCount(1)).toBe('1 PDF');
      expect(formatPdfCount(3)).toBe('3 PDFs');
    });
  });

  describe('Diary & Calendar Calculations', () => {
    test('computes overdue vs upcoming countdown status based on timestamps', () => {
      const now = Date.now();
      const pastTime = now - 86400000;
      const soonTime = now + 12 * 60 * 60 * 1000; // 12 hours
      const futureTime = now + 7 * 86400000; // 7 days

      const overdueResult = diaryService.calculateCountdown(pastTime, false);
      const soonResult = diaryService.calculateCountdown(soonTime, false);
      const upcomingResult = diaryService.calculateCountdown(futureTime, false);
      const completedResult = diaryService.calculateCountdown(pastTime, true);

      expect(overdueResult.status).toBe('overdue');
      expect(['due_soon', 'due_today']).toContain(soonResult.status);
      expect(upcomingResult.status).toBe('upcoming');
      expect(completedResult.status).toBe('completed');
    });
  });

  describe('Timetable Calculations', () => {
    test('calculates timetable daily schedule metrics and free slots', () => {
      const classes: any[] = [
        {
          id: 'cls-1',
          dayOfWeek: 'monday',
          startTime: '09:00',
          endTime: '10:00',
          subjectName: 'Algorithms',
        },
        {
          id: 'cls-2',
          dayOfWeek: 'monday',
          startTime: '11:00',
          endTime: '12:00',
          subjectName: 'Database Systems',
        },
      ];

      const metrics = timetableService.calculateDayMetrics(classes);
      expect(metrics.classCount).toBe(2);
      expect(metrics.firstClassStart).toBe('09:00');
      expect(metrics.lastClassEnd).toBe('12:00');
      expect(metrics.totalClassMinutes).toBe(120);
      expect(metrics.totalUniversityMinutes).toBe(180);
      expect(metrics.totalBreakMinutes).toBe(60);

      const freeSlots = timetableService.findFreeTimeSlots(classes);
      expect(freeSlots.length).toBe(1);
      expect(freeSlots[0].startTime).toBe('10:00');
      expect(freeSlots[0].endTime).toBe('11:00');
      expect(freeSlots[0].durationMinutes).toBe(60);
    });
  });

  describe('Binary and Base64 Conversion Utilities (React Native / Hermes Safe)', () => {
    test('converts base64 string to Uint8Array accurately without Buffer dependency', () => {
      const text = 'Hello, Student Notes Production!';
      const b64 = btoa(text);
      const uint8 = base64ToUint8Array(b64);
      expect(uint8).toBeInstanceOf(Uint8Array);
      expect(uint8.length).toBe(text.length);

      let decodedStr = '';
      for (let i = 0; i < uint8.length; i++) {
        decodedStr += String.fromCharCode(uint8[i]);
      }
      expect(decodedStr).toBe(text);
    });

    test('converts Uint8Array back to Base64 string reliably', () => {
      const originalBytes = new Uint8Array([72, 101, 108, 108, 111, 33]); // "Hello!"
      const b64 = uint8ArrayToBase64(originalBytes);
      expect(b64).toBe(btoa('Hello!'));

      const backToBytes = base64ToUint8Array(b64);
      expect(Array.from(backToBytes)).toEqual([72, 101, 108, 108, 111, 33]);
    });

    test('handles empty and padded base64 gracefully', () => {
      expect(base64ToUint8Array('').length).toBe(0);
      expect(uint8ArrayToBase64(new Uint8Array(0))).toBe('');

      const singleByte = new Uint8Array([65]);
      const b64Single = uint8ArrayToBase64(singleByte);
      expect(base64ToUint8Array(b64Single)[0]).toBe(65);
    });

    test('creates valid ArrayBuffer from base64 for Supabase Storage uploads', () => {
      const testB64 = btoa('Test PDF Binary Payload');
      const arrayBuffer = base64ToArrayBuffer(testB64);
      expect(arrayBuffer.byteLength).toBe(23);
    });
  });

  describe('Database SQLite Parameter Sanitizer', () => {
    const sanitizeParams = (params: any[] = []): any[] => {
      return params.map((p) => (p === undefined ? null : p));
    };

    test('replaces undefined values with null to prevent prepareAsync NullPointerException', () => {
      const raw = ['note_123', undefined, 'Chapter 1', undefined, 12345];
      const sanitized = sanitizeParams(raw);
      expect(sanitized).toEqual(['note_123', null, 'Chapter 1', null, 12345]);
    });

    test('preserves valid null, string, number, and boolean values intact', () => {
      const raw = ['pdf_456', null, 0, false, ''];
      const sanitized = sanitizeParams(raw);
      expect(sanitized).toEqual(['pdf_456', null, 0, false, '']);
    });
  });

  describe('PDF Compression Math & Live Target Estimates', () => {
    test('calculates target quality and estimated byte reduction accurately', () => {
      const originalSize = 104443;
      const compressionInput = '50';
      const numericPct = Math.max(1, Math.min(99, parseInt(compressionInput, 10) || 50));
      const targetQuality = (100 - numericPct) / 100;
      const estimatedOutputSize = Math.max(100, Math.round(originalSize * targetQuality));
      const estimatedSavedBytes = Math.max(0, originalSize - estimatedOutputSize);

      expect(targetQuality).toBe(0.5);
      expect(estimatedOutputSize).toBe(52222);
      expect(estimatedSavedBytes).toBe(52221);
    });

    test('clamps extreme percentage values safely within 1% to 99%', () => {
      const clampPct = (val: string) => {
        const parsed = parseInt(val, 10);
        return isNaN(parsed) ? 50 : Math.max(1, Math.min(99, parsed));
      };
      expect(clampPct('120')).toBe(99);
      expect(clampPct('0')).toBe(1);
      expect(clampPct('-50')).toBe(1);
      expect(clampPct('75')).toBe(75);
      expect(clampPct('')).toBe(50);
    });
  });

  describe('Document Crop Rotation Geometry', () => {
    test('swaps effective dimensions when image is rotated by 90 or 270 degrees', () => {
      const naturalWidth = 3000;
      const naturalHeight = 4000;

      const getEffectiveDimensions = (rot: number) => {
        const isRotated90or270 = rot === 90 || rot === 270;
        return {
          effWidth: isRotated90or270 ? naturalHeight : naturalWidth,
          effHeight: isRotated90or270 ? naturalWidth : naturalHeight,
        };
      };

      expect(getEffectiveDimensions(0)).toEqual({ effWidth: 3000, effHeight: 4000 });
      expect(getEffectiveDimensions(90)).toEqual({ effWidth: 4000, effHeight: 3000 });
      expect(getEffectiveDimensions(180)).toEqual({ effWidth: 3000, effHeight: 4000 });
      expect(getEffectiveDimensions(270)).toEqual({ effWidth: 4000, effHeight: 3000 });
    });
  });
});
