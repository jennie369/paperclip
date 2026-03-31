import React, { useState, useCallback, useMemo } from 'react';
import {
  Image,
  Sparkles,
  Copy,
  Check,
  Save,
  Palette,
  BookOpen,
  Loader2,
  Clock,
  Trash2,
  ChevronRight,
  Info,
  AlertTriangle,
  Edit3,
} from 'lucide-react';
import { Input } from '@gem/ui';
import { Select } from '@gem/ui';
import { Button } from '@gem/ui';
import { Card } from '@gem/ui';
import { CodeBlock } from '@gem/ui';
import { Badge } from '@gem/ui';
import { useToast } from '@gem/ui';
import { Textarea } from '@gem/ui';

// ============================================================================
// GEM Design System Colors
// ============================================================================

const DESIGN_SYSTEM_COLORS = [
  { name: 'Navy', hex: '#112250', role: 'Background' },
  { name: 'Gold', hex: '#FFBD59', role: 'Title (Montserrat Bold)' },
  { name: 'Cyan', hex: '#00F0FF', role: 'Data / Numbers' },
  { name: 'Purple', hex: '#6A5BFF', role: 'Accent' },
  { name: 'Burgundy', hex: '#9C0612', role: 'Warning' },
  { name: 'Green', hex: '#10B981', role: 'Success' },
  { name: 'Pink', hex: '#FF6B9D', role: 'Love' },
  { name: 'White', hex: '#FFFFFF', role: 'Text' },
];

// ============================================================================
// 8 Image Categories
// ============================================================================

const CATEGORIES = [
  {
    key: 'trading-course',
    label: 'Khóa Học Trading',
    defaultTitle: 'Khóa Học Trading Pro',
    defaultDescription: 'Starter/TIER 1-3, giao diện chuyên nghiệp với biểu đồ trading, con số lợi nhuận.',
    defaultAspect: '3:4',
    styleNotes: 'Biểu đồ nến, con số phát sáng Cyan, glassmorphism cards.',
  },
  {
    key: 'mindset-course',
    label: 'Khóa Học Tư Duy',
    defaultTitle: '7 Ngày Tái Tạo Tần Số',
    defaultDescription: '7 Ngày, Tái Tạo, Tần Số Tình Yêu — thiết kế yên bình, ánh sáng tia tím.',
    defaultAspect: '3:4',
    styleNotes: 'Hào quang tím, hạt sáng, nền thiền định.',
  },
  {
    key: 'shopify-thumb',
    label: 'Thumbnail Sản Phẩm Shopify',
    defaultTitle: 'Sản Phẩm Nổi Bật',
    defaultDescription: 'Thumbnail cho sản phẩm trên Shopify, nền Navy đậm, gold border.',
    defaultAspect: '1:1',
    styleNotes: 'Product photography, glassmorphism card nổi bật.',
  },
  {
    key: 'gemral-social',
    label: 'App GEMRAL Social Post',
    defaultTitle: 'Bài Đăng GEMRAL',
    defaultDescription: 'Social post cho App GEMRAL, thiết kế hiện đại, branding nhất quán.',
    defaultAspect: '1:1',
    styleNotes: 'Logo GEMRAL, footer gemral.com, màu thương hiệu.',
  },
  {
    key: 'fb-ads',
    label: 'Facebook Ads',
    defaultTitle: 'Quảng Cáo Facebook',
    defaultDescription: 'Ad creative cho Facebook, CTA rõ ràng, hình ảnh người Việt thật.',
    defaultAspect: '1:1',
    styleNotes: 'CTA button Gold, hình người thật 27-35 tuổi.',
  },
  {
    key: 'marketing-banner',
    label: 'Marketing Banner',
    defaultTitle: 'Banner Chiến Dịch',
    defaultDescription: 'Banner quảng bá chiến dịch marketing, kích thước linh hoạt.',
    defaultAspect: '16:9',
    styleNotes: 'Gradient background, text lớn IN HOA, particles.',
  },
  {
    key: 'partner-banner',
    label: 'GEM Partner (CTV) Banner',
    defaultTitle: 'Banner Cộng Tác Viên',
    defaultDescription: 'Banner cho cộng tác viên GEM, branding nhất quán, QR code.',
    defaultAspect: '3:4',
    styleNotes: 'Branding GEM, thông tin CTV, QR code.',
  },
  {
    key: 'feature-highlight',
    label: 'Feature Highlight',
    defaultTitle: 'Tính Năng Nổi Bật',
    defaultDescription: 'Scanner, Tarot, Sư Phụ — highlight các tính năng app GEMRAL.',
    defaultAspect: '3:4',
    styleNotes: 'Mockup điện thoại, giao diện app, hiệu ứng glow.',
  },
];

// ============================================================================
// Enforced Rules
// ============================================================================

const ENFORCED_RULES = [
  'Tất cả text bằng tiếng Việt có dấu',
  'Người Việt thật 27-35 tuổi (KHÔNG cartoon)',
  'Glassmorphism cards',
  'Tỷ lệ mặc định: 3:4 (dọc)',
  'Hiệu ứng: Particles + Glow',
  'Footer: "gemral.com" căn giữa',
];

// ============================================================================
// Aspect Ratio Options
// ============================================================================

const ASPECT_RATIOS = [
  { value: '3:4', label: '3:4 (Dọc - Mặc định)' },
  { value: '1:1', label: '1:1 (Vuông)' },
  { value: '16:9', label: '16:9 (Ngang)' },
  { value: '9:16', label: '9:16 (Story)' },
  { value: '4:5', label: '4:5 (Instagram)' },
];

// ============================================================================
// Prompt Generator
// ============================================================================

function generatePrompt(
  category,
  title,
  description,
  aspectRatio,
  styleNotes,
) {
  return `DESIGN SYSTEM:
Background: Navy đậm #112250
Title Font: Montserrat Bold, Gold #FFBD59
Data/Numbers: Cyan #00F0FF
Accent: Purple #6A5BFF
Warning: Burgundy #9C0612
Success: Green #10B981
Love: Pink #FF6B9D
Text: White #FFFFFF
Footer: "gemral.com" centered

───────────────────────────────────────

HEADER (15% trên cùng):
- Tiêu đề: "${title}"
- Font: Montserrat Bold, Gold #FFBD59
- Kích thước lớn, IN HOA
- Hiệu ứng glow nhẹ xung quanh chữ

NHÂN VẬT TRUNG TÂM (70%):
- Người Việt Nam thật, 27-35 tuổi
- Biểu cảm tự tin, chuyên nghiệp
- Ánh sáng studio, rim light tím #6A5BFF
- ${description}

3 ĐIỂM NỔI BẬT (Glassmorphism Cards):
- Card 1: [Điểm nổi bật 1]
- Card 2: [Điểm nổi bật 2]
- Card 3: [Điểm nổi bật 3]
- Style: background rgba(255,255,255,0.1), backdrop-blur, border rgba(255,255,255,0.2)
- Số liệu dùng Cyan #00F0FF

HIỆU ỨNG NỀN:
- Particles ánh sáng nhỏ
- Glow effect tím nhẹ
- Gradient: Navy #112250 → Deep Blue #0A1628

───────────────────────────────────────

Category: ${category.label}
Aspect Ratio: ${aspectRatio}
Style Notes: ${styleNotes || category.styleNotes}
Footer: "gemral.com" — căn giữa, font nhỏ, White #FFFFFF`;
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function ImageGenPage() {
  const addToast = useToast((s) => s.addToast);

  // --- Category State ---
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].key);
  const category = useMemo(
    () => CATEGORIES.find((c) => c.key === activeCategory) ?? CATEGORIES[0],
    [activeCategory],
  );

  // --- Form State ---
  const [title, setTitle] = useState(category.defaultTitle);
  const [description, setDescription] = useState(category.defaultDescription);
  const [aspectRatio, setAspectRatio] = useState(category.defaultAspect);
  const [styleNotes, setStyleNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // --- Output State ---
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [copied, setCopied] = useState(false);

  // --- History/Library State ---
  const [savedPrompts, setSavedPrompts] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // --- Selected Color ---
  const [selectedColor, setSelectedColor] = useState(null);
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);

  // --- Switch Category ---
  const handleCategoryChange = useCallback((key) => {
    const cat = CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[0];
    setActiveCategory(key);
    setTitle(cat.defaultTitle);
    setDescription(cat.defaultDescription);
    setAspectRatio(cat.defaultAspect);
    setStyleNotes('');
    setGeneratedPrompt('');
  }, []);

  // --- Generate ---
  const handleGenerate = useCallback(async () => {
    if (!title.trim()) {
      addToast({ type: 'warning', message: 'Vui lòng nhập tiêu đề.' });
      return;
    }
    setIsGenerating(true);
    await new Promise((r) => setTimeout(r, 1000));
    const prompt = generatePrompt(category, title, description, aspectRatio, styleNotes);
    setGeneratedPrompt(prompt);
    setIsGenerating(false);
    addToast({ type: 'success', message: 'Đã tạo prompt hình ảnh.' });
  }, [category, title, description, aspectRatio, styleNotes, addToast]);

  // --- Copy ---
  const handleCopy = useCallback(async () => {
    if (!generatedPrompt) return;
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      addToast({ type: 'success', message: 'Đã sao chép prompt.' });
    } catch {
      addToast({ type: 'error', message: 'Không thể sao chép.' });
    }
  }, [generatedPrompt, addToast]);

  // --- Save to Library ---
  const handleSave = useCallback(() => {
    if (!generatedPrompt) return;
    const saved = {
      id: `sp-${Date.now()}`,
      category: category.label,
      title,
      prompt: generatedPrompt,
      createdAt: new Date().toISOString(),
    };
    setSavedPrompts((prev) => [saved, ...prev]);
    addToast({ type: 'success', message: 'Đã lưu prompt vào thư viện.' });
  }, [generatedPrompt, category, title, addToast]);

  // --- Delete from Library ---
  const handleDeleteSaved = useCallback(
    (id) => {
      setSavedPrompts((prev) => prev.filter((p) => p.id !== id));
      addToast({ type: 'info', message: 'Đã xóa prompt.' });
    },
    [addToast],
  );

  // --- Load from Library ---
  const handleLoadSaved = useCallback(
    (prompt) => {
      setGeneratedPrompt(prompt.prompt);
      setShowHistory(false);
      addToast({ type: 'info', message: 'Đã tải prompt từ thư viện.' });
    },
    [addToast],
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => handleCategoryChange(cat.key)}
            className={`px-3 py-1.5 rounded-badge text-xs font-medium transition-all duration-normal ${activeCategory === cat.key
                ? 'bg-gold text-bg-1 shadow-card-sm'
                : 'bg-glass-bg text-txt-2 hover:text-txt hover:bg-bg-4'
              }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Main Content: 2-column */}
      <div className="g2">
        {/* Left: Form */}
        <Card variant="glass" padding="lg">
          <div className="flex items-center gap-2 mb-5">
            <Image size={22} className="text-gold" />
            <h2 className="font-heading text-xl font-semibold text-txt">Tạo Prompt Hình Ảnh</h2>
          </div>

          <div className="space-y-4">
            <Input
              label="Tiêu đề"
              placeholder="Nhập tiêu đề hình ảnh..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              icon={Image}
            />

            <Textarea
              label="Mô tả chi tiết"
              placeholder="Mô tả nội dung, bố cục, yếu tố cần có..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              showCount
              maxLength={500}
            />

            <Select
              label="Tỷ lệ khung hình"
              options={ASPECT_RATIOS}
              value={aspectRatio}
              onChange={setAspectRatio}
            />

            <Textarea
              label="Ghi chú phong cách (tùy chọn)"
              placeholder="Bổ sung yêu cầu phong cách..."
              value={styleNotes}
              onChange={(e) => setStyleNotes(e.target.value)}
              rows={2}
              hint={`Ghi chú mặc định: ${category.styleNotes}`}
            />

            <Button
              variant="gold"
              icon={Sparkles}
              fullWidth
              loading={isGenerating}
              onClick={handleGenerate}
            >
              Tạo Prompt
            </Button>
          </div>
        </Card>

        {/* Right: Design System + Rules */}
        <div className="space-y-4">
          {/* Color Palette */}
          <Card variant="glass" padding="lg">
            <div className="flex items-center gap-2 mb-4">
              <Palette size={22} className="text-gold" />
              <h3 className="font-heading text-lg font-semibold text-txt">Design System GEM</h3>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-4">
              {DESIGN_SYSTEM_COLORS.map((color) => (
                <button
                  key={color.hex}
                  onClick={() => setSelectedColor(selectedColor?.hex === color.hex ? null : color)}
                  className={`flex flex-col items-center p-2 rounded-card transition-all duration-normal ${selectedColor?.hex === color.hex
                      ? 'bg-bg-4 ring-1 ring-gold'
                      : 'hover:bg-glass-bg'
                    }`}
                  title={`${color.name} ${color.hex} — ${color.role}`}
                >
                  <div
                    className="w-8 h-8 rounded-badge border border-border mb-1"
                    style={{ backgroundColor: color.hex }}
                  />
                  <span className="text-xxs text-txt-3 truncate w-full text-center">
                    {color.name}
                  </span>
                </button>
              ))}
            </div>

            {/* Selected Color Details */}
            {selectedColor && (
              <div className="p-3 rounded-card bg-glass-bg mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-badge border border-border"
                    style={{ backgroundColor: selectedColor.hex }}
                  />
                  <div>
                    <p className="text-sm font-semibold text-txt">{selectedColor.name}</p>
                    <p className="text-xxs text-txt-3 font-mono">{selectedColor.hex}</p>
                    <p className="text-xxs text-txt-2">{selectedColor.role}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Color Scheme Preview */}
            <div className="p-3 rounded-card overflow-hidden" style={{ backgroundColor: '#112250' }}>
              <p className="text-xs font-bold mb-1" style={{ color: '#FFBD59', fontFamily: 'Montserrat, sans-serif' }}>
                TIÊU ĐỀ MẪU
              </p>
              <p className="text-xxs mb-1" style={{ color: '#00F0FF' }}>
                +45.2% | 1,234 người
              </p>
              <p className="text-xxs" style={{ color: '#FFFFFF' }}>
                Nội dung mẫu cho preview
              </p>
              <p className="text-xxs mt-2 text-center" style={{ color: 'rgba(255,255,255,0.5)' }}>
                gemral.com
              </p>
            </div>
          </Card>

          {/* Enforced Rules */}
          <Card variant="glass" padding="lg">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={18} className="text-amber" />
              <h3 className="text-xs font-bold text-txt-2 uppercase tracking-wider">
                Quy Tắc Bắt Buộc
              </h3>
            </div>
            <ul className="space-y-2">
              {ENFORCED_RULES.map((rule, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-txt-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber mt-1.5 shrink-0" />
                  {rule}
                </li>
              ))}
            </ul>
          </Card>

          {/* Prompt History Toggle */}
          <Button
            variant="outline"
            icon={Clock}
            fullWidth
            onClick={() => setShowHistory(!showHistory)}
          >
            {showHistory ? 'Ẩn Thư Viện' : `Thư Viện Prompt (${savedPrompts.length})`}
          </Button>
        </div>
      </div>

      {/* Prompt History Sidebar */}
      {showHistory && (
        <Card variant="glass" padding="lg">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={20} className="text-gold" />
            <h3 className="font-heading text-lg font-semibold text-txt">Thư Viện Prompt</h3>
          </div>

          {savedPrompts.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen size={32} className="mx-auto mb-3 text-txt-3" />
              <p className="text-sm text-txt-3">Chưa có prompt nào được lưu</p>
              <p className="text-xxs text-txt-3 mt-1">Tạo prompt và nhấn &quot;Lưu&quot; để thêm vào thư viện</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {savedPrompts.map((sp) => (
                <div
                  key={sp.id}
                  className="flex items-center gap-3 p-3 rounded-card bg-glass-bg hover:bg-bg-4 transition-all duration-normal group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-semibold text-txt truncate">{sp.title}</p>
                      <Badge text={sp.category} variant="default" size="sm" />
                    </div>
                    <p className="text-xxs text-txt-3">
                      {new Date(sp.createdAt).toLocaleString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleLoadSaved(sp)}
                      className="p-1.5 rounded-badge text-txt-3 hover:text-gold hover:bg-bg-4 transition-all"
                      title="Tải prompt"
                    >
                      <ChevronRight size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteSaved(sp.id)}
                      className="p-1.5 rounded-badge text-txt-3 hover:text-danger hover:bg-bg-4 transition-all"
                      title="Xóa"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Generated Prompt Output */}
      {generatedPrompt && (
        <Card variant="glass" padding="lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="text-gold" />
              <h3 className="font-heading text-lg font-semibold text-txt">Prompt Đã Tạo</h3>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={isEditingPrompt ? Check : Edit3}
                onClick={() => setIsEditingPrompt(!isEditingPrompt)}
              >
                {isEditingPrompt ? 'Xong' : 'Chỉnh sửa'}
              </Button>
              <Button variant="outline" size="sm" icon={copied ? Check : Copy} onClick={handleCopy}>
                {copied ? 'Đã chép' : 'Sao chép'}
              </Button>
              <Button variant="gold" size="sm" icon={Save} onClick={handleSave}>
                Lưu
              </Button>
            </div>
          </div>

          {isEditingPrompt ? (
            <textarea
              value={generatedPrompt}
              onChange={(e) => setGeneratedPrompt(e.target.value)}
              className="w-full bg-glass-bg text-sm text-txt-2 leading-relaxed p-4 rounded-card border border-border focus:outline-none focus:border-gold/40 resize-none font-mono"
              style={{ minHeight: `${Math.max(300, generatedPrompt.split('\n').length * 20)}px` }}
            />
          ) : (
            <CodeBlock
              code={generatedPrompt}
              language="prompt"
              showLineNumbers={false}
              maxHeight="400px"
              copyable
            />
          )}

          <div className="mt-3 flex items-center gap-2">
            <Info size={14} className="text-blue shrink-0" />
            <p className="text-xxs text-txt-3">
              {isEditingPrompt
                ? 'Bạn đang chỉnh sửa prompt. Bấm "Xong" khi hoàn tất.'
                : 'Sao chép prompt này và dán vào công cụ tạo hình ảnh AI (Midjourney, DALL-E, Stable Diffusion).'}
            </p>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!generatedPrompt && !isGenerating && (
        <Card variant="glass" padding="lg">
          <div className="text-center py-8">
            <Image size={40} className="mx-auto mb-3 text-txt-3" />
            <p className="text-sm text-txt-3">
              Chọn thể loại, nhập thông tin và nhấn &quot;Tạo Prompt&quot;
            </p>
            <p className="text-xxs text-txt-3 mt-1">
              Prompt sẽ tự động áp dụng Design System GEM với đầy đủ màu sắc và quy tắc
            </p>
          </div>
        </Card>
      )}

      {isGenerating && (
        <Card variant="glass" padding="lg">
          <div className="flex items-center justify-center py-8 gap-3">
            <Loader2 size={24} className="animate-spin text-gold" />
            <span className="text-sm text-txt-2">Đang tạo prompt...</span>
          </div>
        </Card>
      )}
    </div>
  );
}
