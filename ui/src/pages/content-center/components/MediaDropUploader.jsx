import React, { useState, useRef, useCallback } from 'react';
import {
  Upload,
  Image as ImageIcon,
  AlertCircle,
  X,
  FolderOpen,
} from 'lucide-react';
import { Loader2 } from 'lucide-react';

export default function MediaDropUploader({
  onUpload,
  onOpenLibrary,
  onValidateId,
  onCheckDuplicate,
  generatePositionId,
  accept = 'image/png,image/jpeg,image/gif,image/webp,image/svg+xml',
  maxSizeMB = 10,
  title = 'Upload hình ảnh',
  dropLabel = 'Kéo thả hình ảnh vào đây hoặc click để chọn',
  className = '',
}) {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null); // Keep for single fallback if needed, but not primarily used for display during multi
  const [previewUrl, setPreviewUrl] = useState(null);
  const [positionId, setPositionId] = useState('');
  const [positionIdError, setPositionIdError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadingCount, setUploadingCount] = useState(0);

  const handleFiles = useCallback(async (files) => {
    if (!files || files.length === 0) return;
    
    const allowedTypes = accept.split(',').map((t) => t.trim());
    const validFiles = Array.from(files).filter(file => {
      if (!allowedTypes.includes(file.type)) {
        setUploadError(`Định dạng không hỗ trợ cho ${file.name}`);
        return false;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        setUploadError(`File ${file.name} quá lớn (tối đa ${maxSizeMB}MB)`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setUploadError('');
    setIsUploading(true);
    setUploadingCount(validFiles.length);

    try {
      await Promise.all(validFiles.map(async (file) => {
        const autoId = generatePositionId ? generatePositionId(file.name) : file.name.split('.')[0];
        const result = await onUpload?.(file, { positionId: autoId });
        if (result?.error) throw result.error;
      }));
      // On success, clear the dropzone state (image will appear in gallery)
      handleCancel();
    } catch (err) {
      console.error('[MediaDropUploader] Upload error:', err);
      setUploadError(err?.message || 'Không thể upload file');
    } finally {
      setIsUploading(false);
      setUploadingCount(0);
    }
  }, [accept, maxSizeMB, generatePositionId, onUpload]);

  const hasFiles = (e) => e.dataTransfer?.types?.includes('Files');

  const handleDragEnter = (e) => { 
    e.preventDefault(); 
    e.stopPropagation(); 
    if (hasFiles(e)) setIsDragging(true); 
  };
  const handleDragLeave = (e) => { 
    e.preventDefault(); 
    e.stopPropagation(); 
    setIsDragging(false); 
  };
  const handleDragOver = (e) => { 
    e.preventDefault(); 
    e.stopPropagation(); 
  };
  const handleDrop = (e) => {
    e.preventDefault(); 
    e.stopPropagation(); 
    setIsDragging(false);
    if (!hasFiles(e)) return;
    const files = e.dataTransfer?.files;
    if (files?.length > 0) handleFiles(files);
  };
  const handleInputChange = (e) => {
    const files = e.target.files;
    if (files?.length > 0) handleFiles(files);
    e.target.value = '';
  };
  
  const handleCancel = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setPositionId('');
    setPositionIdError('');
    setUploadError('');
  };

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 m-0 text-base font-semibold text-txt">
          <Upload size={18} />
          {title}
        </h3>
        {onOpenLibrary && (
          <button 
            type="button" 
            onClick={onOpenLibrary}
            className="flex items-center gap-2 px-4 py-2 min-h-[44px] text-sm bg-transparent border rounded-md cursor-pointer text-txt-3 border-border hover:bg-bg-3 transition-colors"
          >
            <FolderOpen size={16} />
            Thư viện hình ảnh
          </button>
        )}
      </div>

      {!isUploading ? (
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors bg-bg-2 ${
            isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-txt-3'
          }`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex justify-center mb-3 text-txt-3">
            <ImageIcon size={48} />
          </div>
          <p className="mb-2 text-sm text-txt-2">{dropLabel}</p>
          <p className="text-xs text-txt-3">PNG, JPG, GIF, WebP, SVG — Tối đa {maxSizeMB}MB</p>
          {uploadError && (
            <div className="flex items-center justify-center gap-1.5 text-sm text-red-500 mt-4">
              <AlertCircle size={14} />
              {uploadError}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleInputChange}
            hidden
            multiple
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-xl bg-bg-2 border-border gap-3">
          <Loader2 size={32} className="animate-spin text-primary" />
          <p className="text-sm font-medium text-txt">
            Đang tải lên {uploadingCount > 1 ? `${uploadingCount} files` : 'file'}...
          </p>
        </div>
      )}
    </div>
  );
}
