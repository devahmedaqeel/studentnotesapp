import { getDatabase } from '../database/database';
import { Subject } from '../types/subject';
import { Folder } from '../types/folder';
import { Note } from '../types/note';
import { PdfDocument } from '../types/pdf';
import { SavedLink } from '../types/savedLink';
import { savedLinkRepository } from '../database/repositories/savedLinkRepository';

export interface SearchResults {
  subjects: Subject[];
  folders: Folder[];
  notes: Note[];
  pdfs: PdfDocument[];
  links: SavedLink[];
}

export const searchService = {
  async search(query: string): Promise<SearchResults> {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return { subjects: [], folders: [], notes: [], pdfs: [], links: [] };
    }

    const db = await getDatabase();
    const pattern = `%${trimmed}%`;

    // 1. Search Subjects
    const subjectRows = await db.getAllAsync<any>(
      `SELECT *, 
        (SELECT COUNT(*) FROM notes n WHERE n.subjectId = s.id) as noteCount,
        (SELECT COUNT(*) FROM pdfs p WHERE p.subjectId = s.id) as pdfCount
       FROM subjects s WHERE LOWER(s.name) LIKE ? ORDER BY s.updatedAt DESC`,
      [pattern]
    );
    const subjects: Subject[] = subjectRows.map((r) => ({
      id: r.id,
      name: r.name,
      icon: r.icon || 'book-outline',
      color: r.color || '#4F46E5',
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      noteCount: r.noteCount || 0,
      pdfCount: r.pdfCount || 0,
    }));

    // 2. Search Folders
    const folderRows = await db.getAllAsync<any>(
      `SELECT *,
        (SELECT COUNT(*) FROM notes n WHERE n.folderId = f.id) as noteCount,
        (SELECT COUNT(*) FROM pdfs p WHERE p.folderId = f.id) as pdfCount
       FROM folders f WHERE LOWER(f.name) LIKE ? ORDER BY f.updatedAt DESC`,
      [pattern]
    );
    const folders: Folder[] = folderRows.map((r) => ({
      id: r.id,
      subjectId: r.subjectId,
      name: r.name,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      noteCount: r.noteCount || 0,
      pdfCount: r.pdfCount || 0,
    }));

    // 3. Search Notes by title or tag name
    const noteRows = await db.getAllAsync<any>(
      `SELECT DISTINCT n.*, s.name as subjectName, f.name as folderName
       FROM notes n
       LEFT JOIN subjects s ON n.subjectId = s.id
       LEFT JOIN folders f ON n.folderId = f.id
       LEFT JOIN note_tags nt ON n.id = nt.noteId
       LEFT JOIN tags t ON nt.tagId = t.id
       WHERE LOWER(n.title) LIKE ? OR LOWER(t.name) LIKE ?
       ORDER BY n.updatedAt DESC`,
      [pattern, pattern]
    );
    const notes: Note[] = noteRows.map((r) => ({
      id: r.id,
      subjectId: r.subjectId,
      folderId: r.folderId,
      title: r.title,
      thumbnailPath: r.thumbnailPath,
      favorite: Boolean(r.favorite),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      subjectName: r.subjectName,
      folderName: r.folderName,
    }));

    // 4. Search PDFs by title
    const pdfRows = await db.getAllAsync<any>(
      `SELECT p.*, s.name as subjectName, f.name as folderName
       FROM pdfs p
       LEFT JOIN subjects s ON p.subjectId = s.id
       LEFT JOIN folders f ON p.folderId = f.id
       WHERE LOWER(p.title) LIKE ?
       ORDER BY p.updatedAt DESC`,
      [pattern]
    );
    const pdfs: PdfDocument[] = pdfRows.map((r) => ({
      id: r.id,
      subjectId: r.subjectId,
      folderId: r.folderId,
      title: r.title,
      filePath: r.filePath,
      pageCount: r.pageCount || 0,
      favorite: Boolean(r.favorite),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      subjectName: r.subjectName,
      folderName: r.folderName,
    }));

    // 5. Search Saved Links
    const links = await savedLinkRepository.search(trimmed);

    return { subjects, folders, notes, pdfs, links };
  },
};
