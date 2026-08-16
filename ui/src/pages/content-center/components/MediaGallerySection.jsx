import React, { useState, useCallback } from 'react';
import { Image as ImageIcon, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, useToast } from '@gem/ui';
import { supabase } from '../../../lib/supabaseClient';
import MediaDropUploader from './MediaDropUploader';
import MediaGalleryGrid from './MediaGalleryGrid';

/**
 * MediaGallerySection — section "Quản lý hình ảnh" độc lập.
 *
 * Tách khỏi CCAIGen (2026-05-30) để trở thành section kéo-thả riêng trong tab
 * "AI Tạo Nội Dung" (ContentPipelinePage → DEFAULT_AIGEN_SECTIONS 'media-gallery').
 * Tự quản state (galleryImages ephemeral) + upload/delete/reorder qua Supabase storage.
 */
export default function MediaGallerySection() {
  const { addToast } = useToast();
  const [galleryImages, setGalleryImages] = useState([]);
  const [showMediaGallery, setShowMediaGallery] = useState(true);

  const handleGalleryUpload = useCallback(async (file, { positionId }) => {
    try {
      if (!supabase) throw new Error('Supabase client not initialized');

      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `content-center/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('course-images')
        .upload(filePath, file);
      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      const { data: publicUrlData } = supabase.storage
        .from('course-images')
        .getPublicUrl(filePath);
      const imageUrl = publicUrlData.publicUrl;

      const { data: { user } } = await supabase.auth.getUser();

      const imageData = {
        lesson_id: 'content-center',
        image_url: imageUrl,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        position_id: positionId,
        is_active: true,
        created_by: user?.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: insertedData, error: dbError } = await supabase
        .from('course_lesson_images')
        .insert(imageData)
        .select()
        .single();
      if (dbError) console.warn('[GalleryUpload] DB insert failed:', dbError);

      const newImage = insertedData || {
        id: Date.now().toString(),
        image_url: imageUrl,
        alt_text: file.name,
        position_id: positionId,
        file_name: file.name,
      };

      setGalleryImages((prev) => [...prev, newImage]);
      addToast({ type: 'success', message: 'Đã thêm hình ảnh vào thư viện' });
      return { success: true };
    } catch (error) {
      console.error('[GalleryUpload] Error:', error);
      addToast({ type: 'error', message: 'Lỗi tải ảnh: ' + (error.message || 'Không xác định') });
      return { error };
    }
  }, [addToast]);

  const handleGalleryDelete = useCallback(async (image) => {
    setGalleryImages((prev) => prev.filter((img) => img.id !== image.id));
    if (image.image_url?.startsWith('blob:')) URL.revokeObjectURL(image.image_url);
    addToast({ type: 'success', message: 'Đã xóa hình ảnh' });
  }, [addToast]);

  const handleGalleryReorder = useCallback((newImages) => {
    setGalleryImages(newImages);
  }, []);

  return (
    <Card variant="glass" padding="none" className="overflow-hidden">
      <button
        type="button"
        onClick={() => setShowMediaGallery(!showMediaGallery)}
        className="flex items-center justify-between w-full p-4 text-left transition-colors hover:bg-bg-2"
      >
        <div className="flex items-center gap-2">
          <ImageIcon size={18} className="text-primary" />
          <span className="font-semibold text-txt">Quản lý hình ảnh ({galleryImages.length})</span>
        </div>
        {showMediaGallery ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
      </button>
      {showMediaGallery && (
        <div className="flex flex-col gap-6 p-4 pt-0 border-t border-border mt-2">
          <MediaDropUploader
            onUpload={handleGalleryUpload}
            generatePositionId={(name) => name.split('.')[0].replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}
          />
          <MediaGalleryGrid
            images={galleryImages}
            onDelete={handleGalleryDelete}
            onReorder={handleGalleryReorder}
          />
        </div>
      )}
    </Card>
  );
}
