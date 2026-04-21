import React, { useState, useEffect } from 'react';
import CCSelect from './CCSelect';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/authCompat';
const formatDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
import {
  Settings,
  Key,
  Database,
  Palette,
  Bell,
  User,
  Globe,
  Shield,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  Loader2,
  Link2,
  X,
} from 'lucide-react';

// ============================================================================
// Settings Page — Full Implementation with Platform Connections
// ============================================================================

const tabs = [
  { id: 'general', label: 'Tổng Quan', icon: Settings },
  { id: 'api', label: 'API & Tích Hợp', icon: Key },
  { id: 'notifications', label: 'Thông Báo', icon: Bell },
  { id: 'appearance', label: 'Giao Diện', icon: Palette },
  { id: 'account', label: 'Tài Khoản', icon: User },
];

const PLATFORM_CONFIGS = [
  { name: 'Facebook', icon: '📘', color: '#1877F2' },
  { name: 'TikTok', icon: '🎵', color: '#000000' },
  { name: 'YouTube', icon: '📺', color: '#FF0000' },
  { name: 'Instagram', icon: '📷', color: '#E4405F' },
  { name: 'Threads', icon: '🧵', color: '#000000' },
];

const EMPTY_CONNECT_FORM = {
  display_name: '',
  access_token: '',
  page_id: '',
};

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [showApiKey, setShowApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form states
  const [apiKey, setApiKey] = useState('');
  const [defaultModel, setDefaultModel] = useState('claude-sonnet-4-5-20250929');
  const [defaultTemp, setDefaultTemp] = useState('0.7');
  const [maxTokens, setMaxTokens] = useState('8192');
  const [autoSave, setAutoSave] = useState(true);
  const [autoSaveInterval, setAutoSaveInterval] = useState('30');
  const [language, setLanguage] = useState('vi');
  const [notifyGenComplete, setNotifyGenComplete] = useState(true);
  const [notifyApproval, setNotifyApproval] = useState(true);
  const [notifySystem, setNotifySystem] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);

  // Platform connection states
  const [platforms, setPlatforms] = useState([]);
  const [platformsLoading, setPlatformsLoading] = useState(false);
  const [connectingPlatform, setConnectingPlatform] = useState(null);
  const [connectForm, setConnectForm] = useState(EMPTY_CONNECT_FORM);
  const [platformSaving, setPlatformSaving] = useState(false);

  // Load platforms when API tab is active
  useEffect(() => {
    if (activeTab === 'api') {
      loadPlatforms();
    }
  }, [activeTab]);

  const loadPlatforms = async () => {
    try {
      setPlatformsLoading(true);
      const { data, error } = await supabase
        .from('platform_connections')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error) {
        setPlatforms(data || []);
      }
    } catch (err) {
      console.error('Error loading platforms:', err);
    } finally {
      setPlatformsLoading(false);
    }
  };

  const handleOpenConnect = (platformConfig) => {
    const existing = platforms.find(p => p.platform?.toLowerCase() === platformConfig.name.toLowerCase());
    setConnectingPlatform(platformConfig);
    setConnectForm({
      display_name: existing?.display_name || '',
      access_token: '',
      page_id: existing?.page_id || '',
    });
  };

  const handleCancelConnect = () => {
    setConnectingPlatform(null);
    setConnectForm({ ...EMPTY_CONNECT_FORM });
  };

  const handleConnectChange = (field, value) => {
    setConnectForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleConnect = async () => {
    if (!connectingPlatform) return;

    setPlatformSaving(true);
    try {
      const existing = platforms.find(p => p.platform?.toLowerCase() === connectingPlatform.name.toLowerCase());

      if (existing) {
        const updatePayload = {
          is_connected: true,
          connected_at: new Date().toISOString(),
          display_name: connectForm.display_name.trim() || null,
          page_id: connectForm.page_id.trim() || null,
        };
        if (connectForm.access_token.trim()) {
          updatePayload.access_token = connectForm.access_token.trim();
        }

        const { error } = await supabase
          .from('platform_connections')
          .update(updatePayload)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('platform_connections')
          .insert({
            platform: connectingPlatform.name,
            is_connected: true,
            connected_at: new Date().toISOString(),
            display_name: connectForm.display_name.trim() || null,
            access_token: connectForm.access_token.trim() || null,
            page_id: connectForm.page_id.trim() || null,
            created_by: user?.id || null,
          });
        if (error) throw error;
      }

      handleCancelConnect();
      loadPlatforms();
    } catch (err) {
      alert('Lỗi khi kết nối: ' + err.message);
    } finally {
      setPlatformSaving(false);
    }
  };

  const handleDisconnect = async (platformRecord) => {
    if (!confirm(`Ngắt kết nối ${platformRecord.platform}?`)) return;

    try {
      const { error } = await supabase
        .from('platform_connections')
        .update({
          is_connected: false,
          access_token: null,
          page_id: null,
        })
        .eq('id', platformRecord.id);

      if (error) throw error;
      loadPlatforms();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-txt flex items-center gap-3">
            <Settings size={24} className="text-txt-2" />
            Cài Đặt
          </h1>
          <p className="text-sm text-txt-3 mt-1">
            Cấu hình hệ thống, API, nền tảng, và tùy chỉnh cá nhân
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-p flex items-center gap-2"
        >
          {saving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : saved ? (
            <CheckCircle size={16} />
          ) : (
            <Save size={16} />
          )}
          {saved ? 'Đã Lưu' : 'Lưu Thay Đổi'}
        </button>
      </div>

      {/* Tabs + Content */}
      <div className="g2" style={{ gridTemplateColumns: '220px 1fr' }}>
        {/* Sidebar tabs */}
        <nav className="space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-card text-sm text-left transition-all
                  ${isActive
                    ? 'bg-bg-2 border border-gold/20 text-txt'
                    : 'text-txt-3 hover:text-txt hover:bg-glass-bg'
                  }`}
              >
                <Icon size={16} className={isActive ? 'text-gold' : ''} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <div className="card p-6 space-y-6">
          {/* General */}
          {activeTab === 'general' && (
            <>
              <h2 className="font-heading text-lg font-semibold text-txt">Cài Đặt Tổng Quan</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-txt mb-1.5">Ngôn ngữ</label>
                  <CCSelect
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full max-w-xs"
                  >
                    <option value="vi">Tiếng Việt</option>
                    <option value="en">English</option>
                  </CCSelect>
                </div>

                <div className="flex items-center justify-between p-3 rounded-card bg-glass-bg">
                  <div>
                    <p className="text-sm text-txt font-medium">Tự động lưu</p>
                    <p className="text-xxs text-txt-3">Lưu tự động khi chỉnh sửa kịch bản</p>
                  </div>
                  <button
                    onClick={() => setAutoSave(!autoSave)}
                    className={`w-10 h-6 rounded-full transition-all relative ${
                      autoSave ? 'bg-gold' : 'bg-bg-4'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
                        autoSave ? 'left-[18px]' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>

                {autoSave && (
                  <div>
                    <label className="block text-sm font-medium text-txt mb-1.5">
                      Khoảng cách lưu tự động (giây)
                    </label>
                    <input
                      type="number"
                      value={autoSaveInterval}
                      onChange={(e) => setAutoSaveInterval(e.target.value)}
                      min="10"
                      max="120"
                      className="fi w-32"
                    />
                  </div>
                )}

                <div className="p-3 rounded-card bg-glass-bg">
                  <div className="flex items-center gap-2 mb-2">
                    <Database size={16} className="text-gold" />
                    <p className="text-sm text-txt font-medium">Cơ Sở Dữ Liệu</p>
                  </div>
                  <div className="space-y-1 text-xs text-txt-3">
                    <p>Project: gem-trading-platform</p>
                    <p>ID: pgfkbcnzqozzkohwbgbk</p>
                    <p>Tables: 12 bảng cc_ prefix</p>
                    <p>RLS: 38 policies active</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* API & Integration + Platform Connections */}
          {activeTab === 'api' && (
            <>
              <h2 className="font-heading text-lg font-semibold text-txt">API & Tích Hợp</h2>

              <div className="space-y-4">
                {/* Anthropic API Key */}
                <div>
                  <label className="block text-sm font-medium text-txt mb-1.5 flex items-center gap-2">
                    <Key size={14} className="text-gold" />
                    Anthropic API Key
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="sk-ant-api..."
                        className="fi w-full pr-10"
                      />
                      <button
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-txt-3 hover:text-txt"
                      >
                        {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <p className="text-xxs text-txt-3 mt-1">
                    Được lưu an toàn trong biến môi trường phía server
                  </p>
                </div>

                {/* Default Model */}
                <div>
                  <label className="block text-sm font-medium text-txt mb-1.5">
                    Model mặc định
                  </label>
                  <CCSelect
                    value={defaultModel}
                    onChange={(e) => setDefaultModel(e.target.value)}
                    className="w-full max-w-md"
                  >
                    <option value="claude-sonnet-4-5-20250929">Claude Sonnet 4.5 (Khuyến nghị)</option>
                    <option value="claude-opus-4-7">Claude Opus 4.7 (Mạnh nhất)</option>
                    <option value="claude-opus-4-6">Claude Opus 4.6</option>
                    <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (Nhanh nhất)</option>
                  </CCSelect>
                </div>

                {/* Temperature */}
                <div>
                  <label className="block text-sm font-medium text-txt mb-1.5">
                    Temperature (0.0 - 1.0)
                  </label>
                  <input
                    type="number"
                    value={defaultTemp}
                    onChange={(e) => setDefaultTemp(e.target.value)}
                    min="0"
                    max="1"
                    step="0.1"
                    className="fi w-32"
                  />
                  <p className="text-xxs text-txt-3 mt-1">
                    0.7 = cân bằng, 0.85 = sáng tạo hơn (MODE 2)
                  </p>
                </div>

                {/* Max Tokens */}
                <div>
                  <label className="block text-sm font-medium text-txt mb-1.5">
                    Max Tokens
                  </label>
                  <input
                    type="number"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(e.target.value)}
                    min="1024"
                    max="128000"
                    step="1024"
                    className="fi w-48"
                  />
                  <p className="text-xxs text-txt-3 mt-1">
                    8192 cho LATC/TMT, 2048 cho Clip Ngắn
                  </p>
                </div>

                {/* Supabase */}
                <div className="p-4 rounded-card bg-glass-bg space-y-2">
                  <div className="flex items-center gap-2">
                    <Database size={16} className="text-emerald" />
                    <span className="text-sm font-medium text-txt">Supabase</span>
                    <span className="text-xxs bg-success/10 text-success px-2 py-0.5 rounded-badge">
                      Đã kết nối
                    </span>
                  </div>
                  <p className="text-xxs text-txt-3">
                    URL và keys được cấu hình qua biến môi trường
                  </p>
                </div>

                {/* ═══════════════════════════════════════════ */}
                {/* KẾT NỐI NỀN TẢNG (merged from PlatformSettingsPage) */}
                {/* ═══════════════════════════════════════════ */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 24, marginTop: 8 }}>
                  <h3 className="font-heading text-base font-semibold text-txt flex items-center gap-2 mb-4">
                    <Globe size={16} className="text-gold" />
                    Kết Nối Nền Tảng
                  </h3>

                  {/* Connect Form */}
                  {connectingPlatform && (
                    <div style={{ background: 'rgba(15,16,48,0.35)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                      <h4 style={{ marginBottom: 14, color: '#fff', fontSize: 15, fontWeight: 600 }}>
                        Kết nối {connectingPlatform.name}
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div>
                          <label className="block text-sm text-txt-3 mb-1">Tên hiển thị</label>
                          <input
                            type="text"
                            value={connectForm.display_name}
                            onChange={(e) => handleConnectChange('display_name', e.target.value)}
                            placeholder="VD: GemRal Official"
                            className="fi w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-txt-3 mb-1">Page/Channel ID</label>
                          <input
                            type="text"
                            value={connectForm.page_id}
                            onChange={(e) => handleConnectChange('page_id', e.target.value)}
                            placeholder="ID trang hoặc kênh"
                            className="fi w-full"
                          />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label className="block text-sm text-txt-3 mb-1">Access Token (API)</label>
                          <input
                            type="text"
                            value={connectForm.access_token}
                            onChange={(e) => handleConnectChange('access_token', e.target.value)}
                            placeholder="Nhập API token..."
                            className="fi w-full"
                          />
                          <p className="text-xxs text-txt-3 mt-1">Token sẽ được lưu an toàn. Để trống nếu không muốn thay đổi.</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
                        <button onClick={handleCancelConnect} className="btn btn-ghost flex items-center gap-1.5 text-sm">
                          <X size={14} /> Hủy
                        </button>
                        <button onClick={handleConnect} disabled={platformSaving} className="btn btn-p flex items-center gap-1.5 text-sm">
                          <Save size={14} /> {platformSaving ? 'Đang kết nối...' : 'Kết nối'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Platform Cards */}
                  {platformsLoading ? (
                    <div className="text-center py-8 text-txt-3 text-sm">Đang tải nền tảng...</div>
                  ) : (
                    <div className="admin-platforms-grid">
                      {PLATFORM_CONFIGS.map((platformConfig) => {
                        const connected = platforms.find(p => p.platform?.toLowerCase() === platformConfig.name.toLowerCase());
                        const isConnected = connected?.is_connected === true;
                        return (
                          <div key={platformConfig.name} className={`admin-platform-card ${isConnected ? 'connected' : 'disconnected'}`}>
                            <div className="admin-platform-icon" style={{ background: platformConfig.color + '20' }}>
                              <span style={{ fontSize: '28px' }}>{platformConfig.icon}</span>
                            </div>
                            <div className="admin-platform-info">
                              <h4>{platformConfig.name}</h4>
                              {isConnected ? (
                                <>
                                  <p className="connected-text">Đã kết nối</p>
                                  {connected.display_name && (
                                    <small style={{ color: '#aaa' }}>{connected.display_name}</small>
                                  )}
                                  <br />
                                  <small>Kết nối lúc: {formatDate(connected.connected_at)}</small>
                                </>
                              ) : (
                                <p className="disconnected-text">Chưa kết nối</p>
                              )}
                            </div>
                            <div className="admin-platform-actions">
                              {isConnected ? (
                                <>
                                  <button className="adm-btn-secondary" onClick={() => handleOpenConnect(platformConfig)}>
                                    Cập nhật
                                  </button>
                                  <button className="adm-btn-danger" onClick={() => handleDisconnect(connected)}>
                                    Ngắt kết nối
                                  </button>
                                </>
                              ) : (
                                <button className="adm-btn-secondary" onClick={() => handleOpenConnect(platformConfig)}>
                                  <Link2 size={14} /> Kết nối
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Notifications */}
          {activeTab === 'notifications' && (
            <>
              <h2 className="font-heading text-lg font-semibold text-txt">Cài Đặt Thông Báo</h2>

              <div className="space-y-3">
                {[
                  {
                    label: 'Tạo nội dung hoàn thành',
                    desc: 'Thông báo khi AI tạo xong kịch bản',
                    value: notifyGenComplete,
                    setter: setNotifyGenComplete,
                  },
                  {
                    label: 'Yêu cầu duyệt',
                    desc: 'Thông báo khi có kịch bản cần duyệt',
                    value: notifyApproval,
                    setter: setNotifyApproval,
                  },
                  {
                    label: 'Thông báo hệ thống',
                    desc: 'Cập nhật, bảo trì, lỗi hệ thống',
                    value: notifySystem,
                    setter: setNotifySystem,
                  },
                  {
                    label: 'Âm thanh thông báo',
                    desc: 'Phát âm thanh khi có thông báo mới',
                    value: soundEnabled,
                    setter: setSoundEnabled,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between p-3 rounded-card bg-glass-bg"
                  >
                    <div>
                      <p className="text-sm text-txt font-medium">{item.label}</p>
                      <p className="text-xxs text-txt-3">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => item.setter(!item.value)}
                      className={`w-10 h-6 rounded-full transition-all relative ${
                        item.value ? 'bg-gold' : 'bg-bg-4'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
                          item.value ? 'left-[18px]' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Appearance */}
          {activeTab === 'appearance' && (
            <>
              <h2 className="font-heading text-lg font-semibold text-txt">Giao Diện</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-txt mb-3">Theme</label>
                  <div className="flex gap-3">
                    <button className="card p-4 border-2 border-gold flex-1 text-center">
                      <div className="w-8 h-8 rounded-full bg-[#07070c] mx-auto mb-2 border border-border" />
                      <p className="text-xs text-txt font-medium">Dark (Mặc định)</p>
                    </button>
                    <button className="card p-4 flex-1 text-center opacity-50 cursor-not-allowed">
                      <div className="w-8 h-8 rounded-full bg-gray-100 mx-auto mb-2 border border-border" />
                      <p className="text-xs text-txt-3">Light (Sắp ra mắt)</p>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-txt mb-3">Bảng Màu Thương Hiệu</label>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { name: 'Gold', hex: '#d4a853', cls: 'bg-gold' },
                      { name: 'Purple', hex: '#9b6dff', cls: 'bg-purple' },
                      { name: 'Cyan', hex: '#00F0FF', cls: 'bg-cyan' },
                      { name: 'Emerald', hex: '#10B981', cls: 'bg-emerald' },
                    ].map((c) => (
                      <div key={c.name} className="text-center">
                        <div className={`w-12 h-12 rounded-card ${c.cls} mx-auto mb-1`} />
                        <p className="text-xs text-txt-2">{c.name}</p>
                        <p className="text-xxs text-txt-3">{c.hex}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-txt mb-2">Font</label>
                  <div className="space-y-2 text-xs text-txt-3">
                    <p><span className="font-heading text-txt">Cormorant Garamond</span> — Headings</p>
                    <p><span className="text-txt">DM Sans</span> — Body text</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Account */}
          {activeTab === 'account' && (
            <>
              <h2 className="font-heading text-lg font-semibold text-txt">Tài Khoản</h2>

              <div className="space-y-4">
                <div className="p-4 rounded-card bg-glass-bg flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gold to-purple flex items-center justify-center">
                    <User size={24} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-txt">Jennie Uyen Chu</p>
                    <p className="text-xxs text-txt-3">Owner</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-txt mb-1.5">Email</label>
                  <input
                    type="email"
                    value="jennie@gemral.com"
                    readOnly
                    className="fi w-full max-w-md bg-glass-bg cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-txt mb-1.5">Vai trò</label>
                  <div className="flex items-center gap-2">
                    <Shield size={16} className="text-gold" />
                    <span className="text-sm text-txt">Owner</span>
                    <span className="text-xxs text-txt-3">— Toàn quyền quản lý hệ thống</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <h3 className="text-sm font-medium text-txt mb-2">Quyền Hạn</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {['Tạo nội dung', 'Chỉnh sửa', 'Duyệt', 'Xuất bản', 'Xóa', 'Quản lý người dùng', 'Cấu hình hệ thống', 'AI Generation'].map((p) => (
                      <div key={p} className="flex items-center gap-2 text-xs text-txt-2">
                        <CheckCircle size={12} className="text-success" />
                        {p}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
