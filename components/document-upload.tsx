'use client';

import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { UploadIcon, FileIcon, XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentUploadProps {
  onUploadComplete: (fileData: any) => void;
  maxSizeMB?: number;
}

export function DocumentUpload({
  onUploadComplete,
  maxSizeMB = 5
}: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = async (files: FileList) => {
    const file = files[0];

    // Check file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`El archivo excede el límite de ${maxSizeMB}MB`);
      return;
    }

    // Check file type
    const supportedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'text/plain', 'text/csv'];
    if (!supportedTypes.includes(file.type)) {
      toast.error('Tipo de archivo no soportado. Sube JPG, PNG, PDF, TXT o CSV.');
      return;
    }

    try {
      setIsUploading(true);

      // Create form data
      const formData = new FormData();
      formData.append('file', file);

      // Upload file
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al subir el archivo');
      }

      const data = await response.json();

      toast.success('Archivo subido correctamente');
      onUploadComplete(data);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error al subir el archivo:', error);
      toast.error(error instanceof Error ? error.message : 'Error al subir el archivo');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="w-full">
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragging ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-300 dark:border-gray-700",
          isUploading ? "pointer-events-none opacity-70" : "hover:border-blue-400 dark:hover:border-blue-600"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          type="file"
          className="hidden"
          onChange={handleFileInputChange}
          ref={fileInputRef}
          accept="image/jpeg,image/png,application/pdf,text/plain,text/csv"
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          {isUploading ? (
            <>
              <div className="size-12 rounded-full border-4 border-gray-200 border-t-blue-500 animate-spin"></div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Subiendo documento...</p>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div
                  className="bg-blue-500 h-2.5 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </>
          ) : (
            <>
              <UploadIcon className="size-10 text-gray-400 dark:text-gray-500" />
              <p className="text-sm font-medium">
                Arrastra y suelta un archivo o <span className="text-blue-500">selecciona un archivo</span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                JPG, PNG, PDF, TXT, CSV (máx. {maxSizeMB}MB)
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface UploadedDocumentProps {
  fileName: string;
  fileType: string;
  onRemove?: () => void;
  isRemovable?: boolean;
}

export function UploadedDocument({
  fileName,
  fileType,
  onRemove,
  isRemovable = true
}: UploadedDocumentProps) {
  const getFileIcon = () => {
    if (fileType.includes('image')) {
      return <FileIcon className="size-4 text-blue-500" />;
    } else if (fileType.includes('pdf')) {
      return <FileIcon className="size-4 text-red-500" />;
    } else if (fileType.includes('text') || fileType.includes('csv')) {
      return <FileIcon className="size-4 text-green-500" />;
    }
    return <FileIcon className="size-4 text-gray-500" />;
  };

  return (
    <div className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-800 rounded-md">
      <div className="flex items-center space-x-2">
        {getFileIcon()}
        <span className="text-sm truncate max-w-[180px]">{fileName}</span>
      </div>

      {isRemovable && onRemove && (
        <button
          onClick={onRemove}
          className="text-gray-500 hover:text-red-500 transition-colors"
          aria-label="Remove document"
        >
          <XIcon className="size-4" />
        </button>
      )}
    </div>
  );
}
