import { pdfCompressionService } from '../src/services/pdfCompressionService';
import { pdfRepository } from '../src/database/repositories/pdfRepository';
import { subjectRepository } from '../src/database/repositories/subjectRepository';
import { noteRepository } from '../src/database/repositories/noteRepository';
import { fileService } from '../src/services/fileService';
import { imageCompressionService } from '../src/services/imageCompressionService';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';

jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn(),
}));

jest.mock('pdf-lib', () => {
  return {
    PDFDocument: {
      load: jest.fn().mockResolvedValue({
        getPageIndices: () => [0, 1],
      }),
      create: jest.fn().mockResolvedValue({
        copyPages: jest.fn().mockResolvedValue([{ page: 1 }, { page: 2 }]),
        addPage: jest.fn(),
        save: jest.fn().mockResolvedValue(new Uint8Array(2048)),
      }),
    },
  };
});

describe('PDF Compression Real Byte-Reduction Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. In-App Note-Backed PDF Compression', () => {
    test('recompresses note pages and generates lightweight PDF with physical byte reduction', async () => {
      const originalPdfSize = 10485760; // 10.0 MB
      const compressedPdfSize = 3145728; // 3.0 MB

      jest.spyOn(pdfRepository, 'getById').mockResolvedValueOnce({
        id: 'pdf-note-1',
        title: 'Algorithms Lecture Notes',
        subjectId: 'subj-1',
        filePath: 'file:///storage/subjects/subj-1/pdfs/pdf-note-1.pdf',
        pageCount: 2,
        favorite: false,
        createdAt: 1000,
        updatedAt: 1000,
        fileSize: originalPdfSize,
      });

      jest.spyOn(noteRepository, 'getAll').mockResolvedValueOnce([
        {
          id: 'note-1',
          title: 'Algorithms Lecture Notes',
          subjectId: 'subj-1',
          favorite: false,
          createdAt: 1000,
          updatedAt: 1000,
          pages: [],
        },
      ]);

      jest.spyOn(noteRepository, 'getById').mockResolvedValueOnce({
        id: 'note-1',
        title: 'Algorithms Lecture Notes',
        subjectId: 'subj-1',
        favorite: false,
        createdAt: 1000,
        updatedAt: 1000,
        pages: [
          { id: 'p1', noteId: 'note-1', pageNumber: 1, filePath: 'file:///p1.jpg', createdAt: 1000 },
          { id: 'p2', noteId: 'note-1', pageNumber: 2, filePath: 'file:///p2.jpg', createdAt: 1000 },
        ],
      });

      jest.spyOn(imageCompressionService, 'compressImage')
        .mockResolvedValueOnce({
          uri: 'file:///cache/comp_p1.jpg',
          base64: 'abc123compressedbase64',
          originalSize: 5000000,
          compressedSize: 1500000,
          savedBytes: 3500000,
          savedPercentage: 70,
          width: 1440,
          height: 1080,
        })
        .mockResolvedValueOnce({
          uri: 'file:///cache/comp_p2.jpg',
          base64: 'def456compressedbase64',
          originalSize: 5000000,
          compressedSize: 1500000,
          savedBytes: 3500000,
          savedPercentage: 70,
          width: 1440,
          height: 1080,
        });

      (Print.printToFileAsync as jest.Mock).mockResolvedValueOnce({
        uri: 'file:///cache/generated_light.pdf',
      });

      jest.spyOn(fileService, 'savePdfFile').mockResolvedValueOnce('file:///storage/subjects/subj-1/pdfs/pdf_comp_123.pdf');

      (FileSystem.getInfoAsync as jest.Mock)
        .mockResolvedValueOnce({ exists: true, size: originalPdfSize }) // getPdfMetadata
        .mockResolvedValueOnce({ exists: true, size: compressedPdfSize }); // outInfo on final PDF

      jest.spyOn(pdfRepository, 'create').mockResolvedValueOnce({
        id: 'pdf_comp_123',
        title: 'Algorithms Lecture Notes (Compressed)',
        subjectId: 'subj-1',
        filePath: 'file:///storage/subjects/subj-1/pdfs/pdf_comp_123.pdf',
        pageCount: 2,
        fileSize: compressedPdfSize,
        favorite: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const res = await pdfCompressionService.compressPdf('pdf-note-1', {
        preset: 'balanced',
        quality: 0.50,
      });

      expect(res.originalSize).toBe(originalPdfSize);
      expect(res.compressedSize).toBe(compressedPdfSize);
      expect(res.savedPercentage).toBe(70); // 70% saved
      expect(res.compressedPdf.fileSize).toBe(compressedPdfSize);
      expect(Print.printToFileAsync).toHaveBeenCalled();
    });
  });

  describe('2. External PDF Compression via Object Streams', () => {
    test('compresses external imported PDF and measures actual output size', async () => {
      const originalSize = 8388608; // 8.0 MB
      const compressedSize = 3500000; // 3.5 MB

      (FileSystem.getInfoAsync as jest.Mock)
        .mockResolvedValueOnce({ exists: true, size: originalSize }) // origInfo
        .mockResolvedValueOnce({ exists: true, size: compressedSize }); // outInfo on saved PDF

      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValueOnce('b64content');
      (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValueOnce(undefined);
      (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);

      jest.spyOn(subjectRepository, 'getAll').mockResolvedValueOnce([
        { id: 'subj-general', name: 'General', color: '#4F46E5', icon: 'book', createdAt: 0, updatedAt: 0 },
      ]);

      jest.spyOn(fileService, 'savePdfFile').mockResolvedValueOnce('file:///storage/subjects/subj-general/pdfs/pdf_ext_99.pdf');

      jest.spyOn(pdfRepository, 'create').mockResolvedValueOnce({
        id: 'pdf_ext_99',
        title: 'Assignment 3 (Compressed)',
        subjectId: 'subj-general',
        filePath: 'file:///storage/subjects/subj-general/pdfs/pdf_ext_99.pdf',
        pageCount: 2,
        fileSize: compressedSize,
        favorite: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const res = await pdfCompressionService.compressExternalPdf(
        'file:///downloads/Assignment3.pdf',
        'Assignment 3',
        { preset: 'balanced', quality: 0.50 }
      );

      expect(res.originalSize).toBe(originalSize);
      expect(res.compressedSize).toBe(compressedSize);
      expect(res.savedPercentage).toBe(58); // 58% physical reduction
      expect(res.createdPdf.fileSize).toBe(compressedSize);
    });
  });

  describe('3. PDF Repository SQLite fileSize Persistence', () => {
    test('creates and retrieves PDF with fileSize accurately persisted', async () => {
      const db = await (await import('../src/database/database')).getDatabase();
      (db.getFirstAsync as jest.Mock).mockResolvedValueOnce({
        id: 'pdf-persisted-1',
        subjectId: 'subj-1',
        folderId: null,
        title: 'Physics Notes',
        filePath: 'file:///storage/physics.pdf',
        pageCount: 5,
        fileSize: 4194304,
        favorite: 0,
        createdAt: 1000,
        updatedAt: 1000,
        subjectName: 'Physics',
        folderName: null,
      });

      const created = await pdfRepository.create({
        subjectId: 'subj-1',
        title: 'Physics Notes',
        filePath: 'file:///storage/physics.pdf',
        pageCount: 5,
        fileSize: 4194304,
      });

      expect(db.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO pdfs (id, subjectId, folderId, title, filePath, pageCount, fileSize, favorite, createdAt, updatedAt)'),
        expect.arrayContaining(['subj-1', 'Physics Notes', 'file:///storage/physics.pdf', 5, 4194304])
      );
      expect(created.fileSize).toBe(4194304);
    });
  });
});
