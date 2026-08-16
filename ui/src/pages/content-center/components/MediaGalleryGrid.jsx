import React, { useState, useCallback, useEffect } from 'react';
import {
  Image as ImageIcon,
  Copy,
  Code,
  Edit3,
  Trash2,
  GripVertical,
  Check,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Download,
  X,
  Loader2
} from 'lucide-react';

export default function MediaGalleryGrid({
  images = [],
  loading = false,
  title = 'Thư viện hình ảnh',
  emptyText = 'Chưa có hình ảnh nào',
  onUpdate,
  onDelete,
  onReorder,
  onEdit,
  className = '',
}) {
  const [copiedId, setCopiedId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [hoveredImageIndex, setHoveredImageIndex] = useState(null);

  // Copy to clipboard helper
  const copyToClipboard = useCallback(async (text, id, type) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(`${id}-${type}`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('[MediaGalleryGrid] Copy failed:', err);
    }
  }, []);

  const handleCopyUrl = (image) => {
    copyToClipboard(image.image_url, image.id, 'url');
  };

  const handleCopyHtml = (image) => {
    const alt = image.alt_text || image.position_id || 'image';
    const htmlTag = `<img src="${image.image_url}" alt="${alt}" />`;
    copyToClipboard(htmlTag, image.id, 'html');
  };

  const handleDelete = async (image) => {
    const name = image.position_id || image.file_name || 'hình ảnh này';
    if (!window.confirm(`Xóa ${name}?`)) return;

    setDeletingId(image.id);
    try {
      await onDelete?.(image);
    } catch (error) {
      console.error('[MediaGalleryGrid] Delete error:', error);
    } finally {
      setDeletingId(null);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e, index) => {
    e.stopPropagation();
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.parentNode);
    e.dataTransfer.setDragImage(e.target.parentNode, 20, 20);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newImages = [...images];
    const [draggedItem] = newImages.splice(draggedIndex, 1);
    newImages.splice(dropIndex, 0, draggedItem);

    onReorder?.(newImages);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = (e) => {
    e.stopPropagation();
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Lightbox handlers
  const openLightbox = useCallback((index) => {
    setLightboxIndex(index);
    setZoomLevel(1);
    setLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    setZoomLevel(1);
  }, []);

  const goToPrevImage = useCallback(() => {
    setLightboxIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    setZoomLevel(1);
  }, [images.length]);

  const goToNextImage = useCallback(() => {
    setLightboxIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    setZoomLevel(1);
  }, [images.length]);

  const zoomIn = useCallback(() => setZoomLevel((prev) => Math.min(prev + 0.25, 3)), []);
  const zoomOut = useCallback(() => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5)), []);

  const downloadImage = useCallback(() => {
    const currentImage = images[lightboxIndex];
    if (currentImage?.image_url) {
      const link = document.createElement('a');
      link.href = currentImage.image_url;
      link.download = currentImage.file_name || currentImage.position_id || 'image';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [images, lightboxIndex]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'Escape': closeLightbox(); break;
        case 'ArrowLeft': goToPrevImage(); break;
        case 'ArrowRight': goToNextImage(); break;
        case '+': case '=': zoomIn(); break;
        case '-': zoomOut(); break;
        default: break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, closeLightbox, goToPrevImage, goToNextImage, zoomIn, zoomOut]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-12 px-6 text-txt-3 ${className}`}>
        <Loader2 size={24} className="animate-spin" />
        <span className="ml-2 text-sm">Đang tải hình ảnh...</span>
      </div>
    );
  }

  if (!images?.length) {
    return (
      <div className={`flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-xl bg-bg-2 border-border text-txt-3 ${className}`}>
        <ImageIcon size={48} className="mb-3 opacity-50" />
        <p className="m-0 text-sm">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 m-0 text-base font-semibold text-txt">
          <ImageIcon size={18} />
          {title}
          <span className="text-sm font-normal text-txt-3">({images.length})</span>
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {images.map((image, index) => (
          <div
            key={image.id}
            className={`flex flex-col bg-bg-2 border rounded-xl overflow-hidden transition-all duration-200 ${
              draggedIndex === index ? 'opacity-50 border-dashed border-primary' : ''
            } ${
              dragOverIndex === index ? 'border-primary bg-primary/5' : 'border-border'
            }`}
            draggable={!!onReorder}
            onDragStart={(e) => onReorder && handleDragStart(e, index)}
            onDragOver={(e) => onReorder && handleDragOver(e, index)}
            onDragLeave={onReorder ? handleDragLeave : undefined}
            onDrop={(e) => onReorder && handleDrop(e, index)}
            onDragEnd={onReorder ? handleDragEnd : undefined}
          >
            <div className="relative flex items-center justify-center h-40 bg-black/20 group">
              <img
                src={image.image_url}
                alt={image.alt_text || image.position_id}
                className="object-contain w-full h-full"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div
                className={`absolute inset-0 flex items-center justify-center transition-all duration-200 cursor-zoom-in ${
                  hoveredImageIndex === index ? 'bg-black/40' : 'bg-transparent'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  openLightbox(index);
                }}
                onMouseEnter={() => setHoveredImageIndex(index)}
                onMouseLeave={() => setHoveredImageIndex(null)}
              >
                <ZoomIn
                  size={28}
                  className={`p-1.5 text-white bg-black/60 rounded-full transition-opacity duration-200 ${
                    hoveredImageIndex === index ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              </div>
              {onReorder && (
                <div className="absolute flex items-center justify-center p-2 text-gray-300 bg-black/60 rounded-lg cursor-grab top-2 left-2 hover:text-white">
                  <GripVertical size={16} />
                </div>
              )}
            </div>

            <div className="p-3.5 flex flex-col flex-1">
              <div className="mb-1 text-sm font-semibold tracking-tight break-all text-primary font-mono">{image.position_id}</div>
              <div className="mb-3 text-xs truncate text-txt-3">{image.file_name}</div>

              <div className="grid grid-cols-4 gap-2 mt-auto">
                <button
                  type="button"
                  className={`flex items-center justify-center gap-1.5 p-2 text-xs transition-colors border rounded-md cursor-pointer bg-white/5 min-h-[40px] ${
                    copiedId === `${image.id}-url` ? 'bg-green-500/10 border-green-500 text-green-500' : 'border-border text-txt-2 hover:bg-bg-3'
                  }`}
                  onClick={() => handleCopyUrl(image)}
                  title="Copy URL"
                >
                  {copiedId === `${image.id}-url` ? <Check size={14} /> : <Copy size={14} />}
                </button>

                <button
                  type="button"
                  className={`flex items-center justify-center gap-1.5 p-2 text-xs transition-colors border rounded-md cursor-pointer bg-white/5 min-h-[40px] ${
                    copiedId === `${image.id}-html` ? 'bg-green-500/10 border-green-500 text-green-500' : 'border-border text-txt-2 hover:bg-bg-3'
                  }`}
                  onClick={() => handleCopyHtml(image)}
                  title="Copy HTML tag"
                >
                  {copiedId === `${image.id}-html` ? <Check size={14} /> : <Code size={14} />}
                </button>

                {onEdit ? (
                  <button
                    type="button"
                    className="flex items-center justify-center gap-1.5 p-2 text-xs transition-colors border rounded-md cursor-pointer bg-white/5 border-border text-txt-2 hover:bg-bg-3 min-h-[40px]"
                    onClick={() => onEdit(image)}
                    title="Chỉnh sửa"
                  >
                    <Edit3 size={14} />
                  </button>
                ) : (
                  <div />
                )}

                {onDelete ? (
                  <button
                    type="button"
                    className="flex items-center justify-center gap-1.5 p-2 text-xs transition-colors border rounded-md cursor-pointer bg-white/5 border-red-500/30 text-red-500 hover:bg-red-500/10 min-h-[40px]"
                    onClick={() => handleDelete(image)}
                    disabled={deletingId === image.id}
                    title="Xóa"
                  >
                    {deletingId === image.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                ) : (
                  <div />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {lightboxOpen && images[lightboxIndex] && (
        <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-black/95" onClick={closeLightbox}>
          <div className="absolute top-0 left-0 right-0 z-[10001] flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/80 to-transparent" onClick={(e) => e.stopPropagation()}>
            <div>
              <div className="text-base font-semibold text-white font-mono">{images[lightboxIndex].position_id}</div>
              <div className="mt-1 text-sm text-gray-400">{images[lightboxIndex].file_name}</div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className="flex items-center justify-center w-11 h-11 text-white transition-colors bg-white/10 rounded-lg cursor-pointer hover:bg-white/20" onClick={zoomOut} title="Thu nhỏ (-)">
                <ZoomOut size={20} />
              </button>
              <button type="button" className="flex items-center justify-center w-11 h-11 text-white transition-colors bg-white/10 rounded-lg cursor-pointer hover:bg-white/20" onClick={zoomIn} title="Phóng to (+)">
                <ZoomIn size={20} />
              </button>
              <button type="button" className="flex items-center justify-center w-11 h-11 text-white transition-colors bg-white/10 rounded-lg cursor-pointer hover:bg-white/20" onClick={downloadImage} title="Tải xuống">
                <Download size={20} />
              </button>
              <button type="button" className="flex items-center justify-center w-11 h-11 text-white transition-colors bg-red-500/30 rounded-lg cursor-pointer hover:bg-red-500/50" onClick={closeLightbox} title="Đóng (Esc)">
                <X size={20} />
              </button>
            </div>
          </div>

          {images.length > 1 && (
            <button
              type="button"
              className="absolute left-6 z-[10001] flex items-center justify-center w-14 h-14 text-white transition-colors -translate-y-1/2 bg-white/10 rounded-full cursor-pointer top-1/2 hover:bg-white/20"
              onClick={(e) => { e.stopPropagation(); goToPrevImage(); }}
              title="Hình trước (←)"
            >
              <ChevronLeft size={28} />
            </button>
          )}

          <div className="flex items-center justify-center flex-1 w-full p-20 overflow-auto" onClick={(e) => e.stopPropagation()}>
            <img
              src={images[lightboxIndex].image_url}
              alt={images[lightboxIndex].alt_text || images[lightboxIndex].position_id}
              className="max-w-full max-h-full transition-transform duration-300 rounded-lg object-contain"
              style={{
                transform: `scale(${zoomLevel})`,
                cursor: zoomLevel > 1 ? 'grab' : 'default',
              }}
              draggable={false}
            />
          </div>

          {images.length > 1 && (
            <button
              type="button"
              className="absolute right-6 z-[10001] flex items-center justify-center w-14 h-14 text-white transition-colors -translate-y-1/2 bg-white/10 rounded-full cursor-pointer top-1/2 hover:bg-white/20"
              onClick={(e) => { e.stopPropagation(); goToNextImage(); }}
              title="Hình sau (→)"
            >
              <ChevronRight size={28} />
            </button>
          )}

          <div className="absolute bottom-0 left-0 right-0 z-[10001] flex items-center justify-center px-6 py-4 bg-gradient-to-t from-black/80 to-transparent" onClick={(e) => e.stopPropagation()}>
            <span className="text-sm text-gray-300">
              {lightboxIndex + 1} / {images.length}
            </span>
            {zoomLevel !== 1 && (
              <span className="ml-4 text-sm font-mono text-primary">
                {Math.round(zoomLevel * 100)}%
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
