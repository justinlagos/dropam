/**
 * File type detection utility for Dropam OS
 * Icons only. No previews. Minimal.
 */

export type FileKind =
  | 'image'
  | 'pdf'
  | 'doc'
  | 'sheet'
  | 'slide'
  | 'zip'
  | 'video'
  | 'audio'
  | 'text'
  | 'unknown';

const MIME_MAP: Record<string, FileKind> = {
  // Images
  'image/jpeg': 'image',
  'image/jpg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'image/svg+xml': 'image',
  'image/bmp': 'image',
  // PDF
  'application/pdf': 'pdf',
  // Documents
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'doc',
  'application/rtf': 'doc',
  'text/rtf': 'doc',
  // Spreadsheets
  'application/vnd.ms-excel': 'sheet',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'sheet',
  'text/csv': 'sheet',
  // Presentations
  'application/vnd.ms-powerpoint': 'slide',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'slide',
  'application/vnd.apple.keynote': 'slide',
  // Archives
  'application/zip': 'zip',
  'application/x-rar-compressed': 'zip',
  'application/x-7z-compressed': 'zip',
  'application/gzip': 'zip',
  // Video
  'video/mp4': 'video',
  'video/quicktime': 'video',
  'video/webm': 'video',
  'video/x-msvideo': 'video',
  // Audio
  'audio/mpeg': 'audio',
  'audio/wav': 'audio',
  'audio/x-m4a': 'audio',
  'audio/ogg': 'audio',
  // Text
  'text/plain': 'text',
  'text/markdown': 'text',
};

const EXT_MAP: Record<string, FileKind> = {
  // Images
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  webp: 'image',
  gif: 'image',
  svg: 'image',
  bmp: 'image',
  // PDF
  pdf: 'pdf',
  // Documents
  doc: 'doc',
  docx: 'doc',
  rtf: 'doc',
  // Spreadsheets
  xls: 'sheet',
  xlsx: 'sheet',
  csv: 'sheet',
  // Presentations
  ppt: 'slide',
  pptx: 'slide',
  key: 'slide',
  // Archives
  zip: 'zip',
  rar: 'zip',
  '7z': 'zip',
  gz: 'zip',
  tar: 'zip',
  // Video
  mp4: 'video',
  mov: 'video',
  webm: 'video',
  avi: 'video',
  mkv: 'video',
  // Audio
  mp3: 'audio',
  wav: 'audio',
  m4a: 'audio',
  ogg: 'audio',
  flac: 'audio',
  // Text
  txt: 'text',
  md: 'text',
};

/**
 * Determine file kind from filename and/or MIME type.
 * Uses MIME first if present, falls back to extension.
 */
export function getFileKind(filename?: string, mime?: string): FileKind {
  // Try MIME type first
  if (mime) {
    const normalized = mime.toLowerCase().trim();
    if (MIME_MAP[normalized]) {
      return MIME_MAP[normalized];
    }
  }

  // Fallback to extension
  if (filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext && EXT_MAP[ext]) {
      return EXT_MAP[ext];
    }
  }

  return 'unknown';
}

/**
 * Get a human-readable label for file kind (for accessibility)
 */
export function getFileKindLabel(kind: FileKind): string {
  const labels: Record<FileKind, string> = {
    image: 'Image',
    pdf: 'PDF',
    doc: 'Document',
    sheet: 'Spreadsheet',
    slide: 'Presentation',
    zip: 'Archive',
    video: 'Video',
    audio: 'Audio',
    text: 'Text',
    unknown: 'File',
  };
  return labels[kind];
}
