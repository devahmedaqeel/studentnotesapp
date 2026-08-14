/**
 * Helper file utilities for extension parsing, type detection, and size formatting.
 */

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function detectDocumentType(fileName: string, mimeType?: string): 'pdf' | 'doc' | 'docx' | 'ppt' | 'pptx' | 'other' {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith('.pdf') || mimeType === 'application/pdf') {
    return 'pdf';
  }
  if (lowerName.endsWith('.docx') || mimeType?.includes('wordprocessingml')) {
    return 'docx';
  }
  if (lowerName.endsWith('.doc') || mimeType === 'application/msword') {
    return 'doc';
  }
  if (lowerName.endsWith('.pptx') || mimeType?.includes('presentationml')) {
    return 'pptx';
  }
  if (lowerName.endsWith('.ppt') || mimeType === 'application/vnd.ms-powerpoint') {
    return 'ppt';
  }
  return 'other';
}

export function getDocumentMimeType(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (lower.endsWith('.doc')) return 'application/msword';
  if (lower.endsWith('.pptx')) return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  if (lower.endsWith('.ppt')) return 'application/vnd.ms-powerpoint';
  return 'application/octet-stream';
}
