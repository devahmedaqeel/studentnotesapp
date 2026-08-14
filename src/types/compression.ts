export type CompressionPreset = 'original' | 'high_quality' | 'balanced' | 'small' | 'custom';
export type OutputFormat = 'jpeg' | 'png' | 'webp';
export type PageSize = 'A4' | 'Letter' | 'Auto';

export interface ImageCompressionConfig {
  preset: CompressionPreset;
  quality: number; // 0.1 to 1.0
  maxResolution?: number; // e.g. 1200, 1600, 2000, 2500, 3000, 4000
  format: OutputFormat;
  preserveAspectRatio: boolean;
}

export interface PdfCompressionConfig {
  preset: CompressionPreset;
  quality: number; // 0.1 to 1.0
  maxResolution?: number; // e.g. 1200, 1600, 2000, 2500, 3000
  pageSize: PageSize;
  format: OutputFormat;
  preserveAspectRatio: boolean;
}

export interface ImageMetadata {
  uri: string;
  width: number;
  height: number;
  fileSize: number;
  format: string;
}

export interface CompressionResult {
  uri: string;
  base64?: string;
  originalSize: number;
  compressedSize: number;
  savedBytes: number;
  savedPercentage: number;
  width: number;
  height: number;
}

export interface UniversalFileResult {
  uri: string;
  name: string;
  type: 'image' | 'pdf';
  originalSize: number;
  compressedSize: number;
  savedBytes: number;
  reductionPercentage: number;
  originalWidth?: number;
  originalHeight?: number;
  outputWidth?: number;
  outputHeight?: number;
  format?: string;
  pageCount?: number;
}
