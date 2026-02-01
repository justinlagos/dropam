/**
 * Minimal file type icons for Dropam OS
 * Quiet, neutral, OS-like. No previews, no thumbnails.
 */
import React from 'react';
import { FileKind } from '../../utils/fileType';

interface FileIconProps {
  kind: FileKind;
  size?: number;
  className?: string;
}

// Base icon wrapper for consistent sizing
const IconWrapper: React.FC<{ size: number; className?: string; children: React.ReactNode }> = ({
  size,
  className = '',
  children
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {children}
  </svg>
);

// Image icon - landscape with sun/mountain
const ImageIcon: React.FC<{ size: number; className?: string }> = ({ size, className }) => (
  <IconWrapper size={size} className={className}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </IconWrapper>
);

// PDF icon - document with 'PDF' indicator
const PdfIcon: React.FC<{ size: number; className?: string }> = ({ size, className }) => (
  <IconWrapper size={size} className={className}>
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M9 15h6" />
    <path d="M9 11h6" />
  </IconWrapper>
);

// Document icon - simple doc with lines
const DocIcon: React.FC<{ size: number; className?: string }> = ({ size, className }) => (
  <IconWrapper size={size} className={className}>
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M16 13H8" />
    <path d="M16 17H8" />
    <path d="M10 9H8" />
  </IconWrapper>
);

// Spreadsheet icon - grid
const SheetIcon: React.FC<{ size: number; className?: string }> = ({ size, className }) => (
  <IconWrapper size={size} className={className}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18" />
    <path d="M3 15h18" />
    <path d="M9 3v18" />
    <path d="M15 3v18" />
  </IconWrapper>
);

// Presentation icon - slide with bar chart
const SlideIcon: React.FC<{ size: number; className?: string }> = ({ size, className }) => (
  <IconWrapper size={size} className={className}>
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8" />
    <path d="M12 17v4" />
    <path d="M7 13V9" />
    <path d="M12 13V8" />
    <path d="M17 13V10" />
  </IconWrapper>
);

// Archive icon - box/package
const ZipIcon: React.FC<{ size: number; className?: string }> = ({ size, className }) => (
  <IconWrapper size={size} className={className}>
    <path d="M21 8v13H3V8" />
    <path d="M1 3h22v5H1z" />
    <path d="M10 12h4" />
  </IconWrapper>
);

// Video icon - play in frame
const VideoIcon: React.FC<{ size: number; className?: string }> = ({ size, className }) => (
  <IconWrapper size={size} className={className}>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none" />
  </IconWrapper>
);

// Audio icon - music note
const AudioIcon: React.FC<{ size: number; className?: string }> = ({ size, className }) => (
  <IconWrapper size={size} className={className}>
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </IconWrapper>
);

// Text icon - simple document
const TextIcon: React.FC<{ size: number; className?: string }> = ({ size, className }) => (
  <IconWrapper size={size} className={className}>
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M12 18v-6" />
    <path d="M9 15h6" />
  </IconWrapper>
);

// Unknown/generic file icon
const UnknownIcon: React.FC<{ size: number; className?: string }> = ({ size, className }) => (
  <IconWrapper size={size} className={className}>
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <path d="M14 2v6h6" />
  </IconWrapper>
);

/**
 * Main FileIcon component
 * Returns appropriate icon based on FileKind
 */
export const FileIcon: React.FC<FileIconProps> = ({ kind, size = 24, className = '' }) => {
  const iconMap: Record<FileKind, React.FC<{ size: number; className?: string }>> = {
    image: ImageIcon,
    pdf: PdfIcon,
    doc: DocIcon,
    sheet: SheetIcon,
    slide: SlideIcon,
    zip: ZipIcon,
    video: VideoIcon,
    audio: AudioIcon,
    text: TextIcon,
    unknown: UnknownIcon,
  };

  const Icon = iconMap[kind] || UnknownIcon;
  return <Icon size={size} className={className} />;
};

export default FileIcon;
