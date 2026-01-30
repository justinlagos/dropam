import React, { useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';

interface FileUploadProps {
  onDrop: (files: File[], e: React.DragEvent) => void;
  className?: string;
  fullscreen?: boolean;
  children?: React.ReactNode;
  overlayText?: string;
  progress?: number | null; // 0-100, or null/undefined if idle
  fileName?: string | null;
  allowedTypes?: string[];
  disabled?: boolean;
  clickToUpload?: boolean;
  multiple?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onDrop,
  className = '',
  fullscreen = false,
  children,
  overlayText = "Drop files here",
  progress = null,
  fileName = null,
  disabled = false,
  clickToUpload = false,
  multiple = false
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    
    // Only highlight if dragging files
    if (e.dataTransfer.types.includes('Files')) {
       setIsDragOver(true);
       e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget === e.target) {
        setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      onDrop(files, e);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      onDrop(files, {} as React.DragEvent); 
    }
  };

  const isUploading = progress !== null && progress !== undefined;

  return (
    <div
      className={`relative ${className}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => clickToUpload && !isUploading && fileInputRef.current?.click()}
    >
      {clickToUpload && (
        <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileSelect}
            disabled={disabled || isUploading}
            multiple={multiple}
        />
      )}

      {children}

      {/* Drag Overlay */}
      {isDragOver && (
        <div className={`absolute z-50 flex items-center justify-center pointer-events-none transition-all duration-200
            ${fullscreen 
                ? 'inset-6 border-2 border-dashed border-[#111111] bg-[#FAFAFA]/95 rounded-xl' 
                : 'inset-0 bg-gray-50 border border-[#111111] border-dashed rounded-lg'
            }
        `}>
          <p className={`${fullscreen ? 'text-lg font-medium' : 'text-sm font-medium'} text-[#111111]`}>
            {overlayText}
          </p>
        </div>
      )}

      {/* Progress Overlay / Indicator */}
      {isUploading && (
         <div className={`absolute z-50 flex flex-col items-center justify-center pointer-events-none
            ${fullscreen 
               ? 'bottom-12 left-1/2 transform -translate-x-1/2 bg-[#111111] text-white px-6 py-4 rounded-lg shadow-xl min-w-[240px]' 
               : 'inset-0 bg-white/90 backdrop-blur-[1px] rounded-lg'
            }
         `}>
            {fullscreen ? (
               // Toast Style for Fullscreen
               <div className="w-full">
                  <div className="flex justify-between items-center mb-2">
                     <span className="text-sm font-medium truncate max-w-[150px]">{fileName || 'Uploading...'}</span>
                     <span className="text-xs text-gray-400">{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
                     <div 
                        className="h-full bg-white transition-all duration-150 ease-out"
                        style={{ width: `${progress}%` }}
                     />
                  </div>
               </div>
            ) : (
               // Inline Style for Box
               <div className="flex flex-col items-center p-2 w-full">
                   <Loader2 size={16} className="animate-spin text-[#111111] mb-2" />
                   <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden mb-1">
                       <div 
                          className="h-full bg-[#111111] transition-all duration-150"
                          style={{ width: `${progress}%` }}
                       />
                   </div>
                   <span className="text-[10px] text-[#6B6B6B]">Uploading {Math.round(progress)}%</span>
               </div>
            )}
         </div>
      )}
    </div>
  );
};