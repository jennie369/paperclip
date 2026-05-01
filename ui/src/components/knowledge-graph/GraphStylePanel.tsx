// GraphStylePanel — Floating control panel for visual style
// Presets: GEM Gold, Pastel Dream, Neon Cyber, Classic Dark, Void Purple, Aurora, Solar Flare,
//          Cosmic Nebula, Deep Ocean, Crystal Forest
// Expanded 2026-04-10 to match App Phong Thủy Đế Vương Mắt Thần feature parity:
//   +particleGlow, +ambientParticleSize, +edgeDefaultWidth, +edgeCurve,
//   +nodeBorderColor, +nodeBorderWidth, +textSize, +nodeOpacityFloor, +nodeBaseOpacity,
//   +backgroundColor, +starfield, +starfieldDensity, +starfieldSpeed,
//   +collideRadius, +centerStrength, +cameraFov, +cameraDamping
//   + custom template save/load with localStorage persistence

import { useState, useEffect, useCallback } from "react";
import { Sliders, ChevronDown, ChevronUp, Palette, Save, Trash2 } from "lucide-react";

// ═══════════════ STYLE INTERFACE ═══════════════
export interface GraphStyle {
  // ─── Particle — flowing along edges ──────────────────
  particleColor: string;
  particleSize: number;
  particleSpeed: number;
  particleCount: number;         // per highlighted edge
  particleGlow: number;          // NEW: halo radius multiplier for particles 0..5
  ambientParticles: boolean;     // show particles on ALL edges (not just highlighted)
  ambientParticleCount: number;  // particles per non-highlighted edge
  ambientParticleAlpha: number;  // opacity multiplier 0..1
  ambientParticleSize: number;   // NEW: separate ambient particle size multiplier 0.3..3

  // ─── Edge ─────────────────────────────────────────────
  edgeHighlightColor: string;
  edgeHighlightOpacity: number;
  edgeHighlightWidth: number;
  edgeDefaultColor: string;
  edgeDefaultOpacity: number;
  edgeDefaultWidth: number;      // NEW: separate default edge thickness 0.5..15
  edgeCurve: number;             // NEW: 0 = straight, 0.1..2 = curved bow

  // ─── Node ─────────────────────────────────────────────
  nodeShape: "circle" | "ring" | "diamond" | "hexagon" | "cross";
  nodeSizeMultiplier: number;
  nodeGlowIntensity: number;    // 0..10
  nodeBorderColor: string;       // NEW: persistent border color (not just selection)
  nodeBorderWidth: number;       // NEW: persistent border width 0..5
  textSize: number;              // NEW: label scale 0.4..4
  nodeOpacityFloor: number;      // NEW: opacity of dimmed non-highlighted nodes 0.02..0.5
  nodeBaseOpacity: number;       // NEW: opacity when nothing is selected 0.3..1

  // ─── Selection ring ───────────────────────────────────
  selectionRingColor: string;
  selectionRingSize: number;    // multiplier vs node radius

  // ─── Sáng (background + starfield) ────────────────────
  backgroundColor: string;       // NEW: scene clearColor
  starfield: boolean;            // NEW: toggle drei <Stars> background
  starfieldDensity: number;      // NEW: star count 500..10000
  starfieldSpeed: number;        // NEW: star rotation 0..2

  // ─── Physics / Spatials ───────────────────────────────
  linkDistance: number;
  chargeStrength: number;
  rotationSpeed: number;
  collideRadius: number;         // NEW: forceCollide radius 0..40
  centerStrength: number;        // NEW: forceCenter strength 0..1
  cameraFov: number;             // NEW: camera field of view 30..90
  cameraDamping: number;         // NEW: OrbitControls dampingFactor 0.02..0.5
}

// ═══════════════ DEFAULTS FOR NEW FIELDS ═══════════════
// Every preset inherits these unless it overrides individually.
// backgroundColor = "" means "inherit from page theme" (Paperclip bg-background
// via Canvas className). Stylized presets can override with a specific hex.
const NEW_FIELD_DEFAULTS = {
  particleGlow:          2.2,
  ambientParticleSize:   1.0,
  edgeDefaultWidth:      1.5,
  edgeCurve:             0,
  nodeBorderColor:       "#ffffff",
  nodeBorderWidth:       0,
  textSize:              1.0,
  nodeOpacityFloor:      0.12,
  nodeBaseOpacity:       0.9,
  backgroundColor:       "",          // "" = inherit from Paperclip theme
  starfield:             false,
  starfieldDensity:      3000,
  starfieldSpeed:        0.4,
  collideRadius:         16,
  centerStrength:        0.1,
  cameraFov:             60,
  cameraDamping:         0.1,
} as const;

// ═══════════════ PRESET THEMES ═══════════════
export const GRAPH_PRESETS: Record<string, GraphStyle> = {
  gem_gold: {
    particleColor:          "#00F0FF",
    particleSize:           1.4,
    particleSpeed:          0.5,
    particleCount:          4,
    ambientParticles:       true,
    ambientParticleCount:   1,
    ambientParticleAlpha:   0.4,
    edgeHighlightColor:     "#FFBD59",
    edgeHighlightOpacity:   1.0,
    edgeHighlightWidth:     3,
    edgeDefaultColor:       "#1e3a5f",
    edgeDefaultOpacity:     0.3,
    nodeShape:              "ring",
    nodeSizeMultiplier:     1.0,
    nodeGlowIntensity:      1.0,
    selectionRingColor:     "#FFBD59",
    selectionRingSize:      1.5,
    linkDistance:           40,
    chargeStrength:         -150,
    rotationSpeed:          0.15,
    ...NEW_FIELD_DEFAULTS,
    // gem_gold inherits Paperclip theme background
  },
  pastel_dream: {
    particleColor:          "#FFC8DD",
    particleSize:           1.1,
    particleSpeed:          0.3,
    particleCount:          3,
    ambientParticles:       true,
    ambientParticleCount:   1,
    ambientParticleAlpha:   0.35,
    edgeHighlightColor:     "#BDE0FE",
    edgeHighlightOpacity:   0.9,
    edgeHighlightWidth:     2,
    edgeDefaultColor:       "#d8b4fe",
    edgeDefaultOpacity:     0.2,
    nodeShape:              "circle",
    nodeSizeMultiplier:     0.9,
    nodeGlowIntensity:      0.7,
    selectionRingColor:     "#FFAFCC",
    selectionRingSize:      1.4,
    linkDistance:           35,
    chargeStrength:         -130,
    rotationSpeed:          0.10,
    ...NEW_FIELD_DEFAULTS,
    edgeCurve:              0.3,
  },
  neon_cyber: {
    particleColor:          "#39FF14",
    particleSize:           1.8,
    particleSpeed:          0.8,
    particleCount:          6,
    ambientParticles:       true,
    ambientParticleCount:   2,
    ambientParticleAlpha:   0.5,
    edgeHighlightColor:     "#00FFFF",
    edgeHighlightOpacity:   1.0,
    edgeHighlightWidth:     4,
    edgeDefaultColor:       "#0a2a1a",
    edgeDefaultOpacity:     0.3,
    nodeShape:              "ring",
    nodeSizeMultiplier:     1.1,
    nodeGlowIntensity:      1.6,
    selectionRingColor:     "#FF00FF",
    selectionRingSize:      1.7,
    linkDistance:           50,
    chargeStrength:         -200,
    rotationSpeed:          0.30,
    ...NEW_FIELD_DEFAULTS,
    particleGlow:           3.5,
  },
  classic_dark: {
    particleColor:          "#60A5FA",
    particleSize:           1.0,
    particleSpeed:          0.35,
    particleCount:          2,
    ambientParticles:       false,
    ambientParticleCount:   1,
    ambientParticleAlpha:   0.2,
    edgeHighlightColor:     "#94A3B8",
    edgeHighlightOpacity:   0.85,
    edgeHighlightWidth:     2,
    edgeDefaultColor:       "#334155",
    edgeDefaultOpacity:     0.3,
    nodeShape:              "circle",
    nodeSizeMultiplier:     1.0,
    nodeGlowIntensity:      0.5,
    selectionRingColor:     "#F1F5F9",
    selectionRingSize:      1.4,
    linkDistance:           45,
    chargeStrength:         -140,
    rotationSpeed:          0.15,
    ...NEW_FIELD_DEFAULTS,
    particleGlow:           1.5,
  },
  void_purple: {
    particleColor:          "#E879F9",
    particleSize:           1.3,
    particleSpeed:          0.45,
    particleCount:          4,
    ambientParticles:       true,
    ambientParticleCount:   1,
    ambientParticleAlpha:   0.4,
    edgeHighlightColor:     "#A78BFA",
    edgeHighlightOpacity:   0.95,
    edgeHighlightWidth:     3,
    edgeDefaultColor:       "#2d1459",
    edgeDefaultOpacity:     0.35,
    nodeShape:              "hexagon",
    nodeSizeMultiplier:     1.0,
    nodeGlowIntensity:      1.2,
    selectionRingColor:     "#6A5BFF",
    selectionRingSize:      1.6,
    linkDistance:           38,
    chargeStrength:         -180,
    rotationSpeed:          0.20,
    ...NEW_FIELD_DEFAULTS,
    backgroundColor:        "#140020",
    starfield:              true,
    edgeCurve:              0.5,
  },
  aurora: {
    particleColor:          "#7FFFD4",
    particleSize:           1.5,
    particleSpeed:          0.4,
    particleCount:          5,
    ambientParticles:       true,
    ambientParticleCount:   2,
    ambientParticleAlpha:   0.45,
    edgeHighlightColor:     "#5EEAD4",
    edgeHighlightOpacity:   1.0,
    edgeHighlightWidth:     3,
    edgeDefaultColor:       "#0f3d3a",
    edgeDefaultOpacity:     0.28,
    nodeShape:              "ring",
    nodeSizeMultiplier:     0.95,
    nodeGlowIntensity:      1.3,
    selectionRingColor:     "#F0ABFC",
    selectionRingSize:      1.55,
    linkDistance:           42,
    chargeStrength:         -160,
    rotationSpeed:          0.25,
    ...NEW_FIELD_DEFAULTS,
    backgroundColor:        "#041d2b",
    starfield:              true,
    edgeCurve:              0.4,
    particleGlow:           2.8,
  },
  solar_flare: {
    particleColor:          "#FCD34D",
    particleSize:           1.7,
    particleSpeed:          0.65,
    particleCount:          5,
    ambientParticles:       true,
    ambientParticleCount:   2,
    ambientParticleAlpha:   0.5,
    edgeHighlightColor:     "#FB923C",
    edgeHighlightOpacity:   1.0,
    edgeHighlightWidth:     4,
    edgeDefaultColor:       "#3b1200",
    edgeDefaultOpacity:     0.3,
    nodeShape:              "diamond",
    nodeSizeMultiplier:     1.15,
    nodeGlowIntensity:      1.8,
    selectionRingColor:     "#F97316",
    selectionRingSize:      1.8,
    linkDistance:           45,
    chargeStrength:         -190,
    rotationSpeed:          0.40,
    ...NEW_FIELD_DEFAULTS,
    particleGlow:           3.2,
  },
  // ─── NEW PRESETS (2026-04-10, inspired by App Phong Thủy Mắt Thần) ───
  cosmic_nebula: {
    particleColor:          "#a855f7",
    particleSize:           2.2,
    particleSpeed:          0.35,
    particleCount:          6,
    ambientParticles:       true,
    ambientParticleCount:   3,
    ambientParticleAlpha:   0.55,
    edgeHighlightColor:     "#c084fc",
    edgeHighlightOpacity:   1.0,
    edgeHighlightWidth:     4,
    edgeDefaultColor:       "#3b0764",
    edgeDefaultOpacity:     0.4,
    nodeShape:              "hexagon",
    nodeSizeMultiplier:     1.05,
    nodeGlowIntensity:      2.0,
    selectionRingColor:     "#f472b6",
    selectionRingSize:      1.8,
    linkDistance:           55,
    chargeStrength:         -220,
    rotationSpeed:          0.08,
    ...NEW_FIELD_DEFAULTS,
    backgroundColor:        "#0a0320",
    starfield:              true,
    starfieldDensity:       5000,
    starfieldSpeed:         0.15,
    particleGlow:           4.0,
    edgeCurve:              0.6,
    cameraFov:              65,
  },
  deep_ocean: {
    particleColor:          "#38bdf8",
    particleSize:           1.6,
    particleSpeed:          0.4,
    particleCount:          5,
    ambientParticles:       true,
    ambientParticleCount:   2,
    ambientParticleAlpha:   0.45,
    edgeHighlightColor:     "#22d3ee",
    edgeHighlightOpacity:   1.0,
    edgeHighlightWidth:     3,
    edgeDefaultColor:       "#0c4a6e",
    edgeDefaultOpacity:     0.35,
    nodeShape:              "circle",
    nodeSizeMultiplier:     1.0,
    nodeGlowIntensity:      1.4,
    selectionRingColor:     "#67e8f9",
    selectionRingSize:      1.6,
    linkDistance:           48,
    chargeStrength:         -175,
    rotationSpeed:          0.10,
    ...NEW_FIELD_DEFAULTS,
    backgroundColor:        "#020617",
    starfield:              true,
    starfieldDensity:       2500,
    starfieldSpeed:         0.25,
    particleGlow:           2.5,
    edgeCurve:              0.3,
  },
  crystal_forest: {
    particleColor:          "#34d399",
    particleSize:           1.8,
    particleSpeed:          0.55,
    particleCount:          4,
    ambientParticles:       true,
    ambientParticleCount:   2,
    ambientParticleAlpha:   0.5,
    edgeHighlightColor:     "#6ee7b7",
    edgeHighlightOpacity:   1.0,
    edgeHighlightWidth:     3,
    edgeDefaultColor:       "#064e3b",
    edgeDefaultOpacity:     0.32,
    nodeShape:              "diamond",
    nodeSizeMultiplier:     1.1,
    nodeGlowIntensity:      1.5,
    selectionRingColor:     "#a7f3d0",
    selectionRingSize:      1.7,
    linkDistance:           44,
    chargeStrength:         -170,
    rotationSpeed:          0.18,
    ...NEW_FIELD_DEFAULTS,
    backgroundColor:        "#052e2b",
    starfield:              false,
    particleGlow:           2.8,
    edgeCurve:              0.2,
    nodeBorderColor:        "#6ee7b7",
    nodeBorderWidth:        0.5,
  },
};

// ─── Helper: ensure a style has all new fields (for old presets loaded from localStorage) ───
export function normalizeGraphStyle(style: Partial<GraphStyle> | undefined): GraphStyle {
  const base = GRAPH_PRESETS.gem_gold;
  return { ...base, ...NEW_FIELD_DEFAULTS, ...(style ?? {}) } as GraphStyle;
}

const PRESET_META: Record<string, { label: string; emoji: string }> = {
  gem_gold:       { label: "GEM Gold",  emoji: "✨" },
  pastel_dream:   { label: "Pastel",    emoji: "🌸" },
  neon_cyber:     { label: "Neon",      emoji: "⚡" },
  classic_dark:   { label: "Classic",   emoji: "🌑" },
  void_purple:    { label: "Void",      emoji: "🔮" },
  aurora:         { label: "Aurora",    emoji: "🌌" },
  solar_flare:    { label: "Solar",     emoji: "☀️" },
  cosmic_nebula:  { label: "Nebula",    emoji: "🪐" },
  deep_ocean:     { label: "Ocean",     emoji: "🌊" },
  crystal_forest: { label: "Crystal",   emoji: "🌲" },
};

// ═══════════════ CUSTOM TEMPLATES ═══════════════
// User-saved snapshots persisted to localStorage. Survives refresh.
export interface CustomTemplate {
  id: string;
  name: string;
  createdAt: number;
  style: GraphStyle;
}

const TEMPLATE_STORAGE_KEY = "paperclip-matthan-custom-templates-v1";

function loadTemplatesFromStorage(): CustomTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Normalize — old templates may be missing new fields
    return parsed.map((t: any) => ({
      id: String(t.id),
      name: String(t.name || "Untitled"),
      createdAt: Number(t.createdAt || Date.now()),
      style: normalizeGraphStyle(t.style),
    }));
  } catch {
    return [];
  }
}

function persistTemplatesToStorage(list: CustomTemplate[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* quota / private mode — ignore */
  }
}

const NODE_SHAPES: Array<{ value: GraphStyle["nodeShape"]; label: string }> = [
  { value: "circle",  label: "Tròn" },
  { value: "ring",    label: "Vòng" },
  { value: "diamond", label: "Kim cương" },
  { value: "hexagon", label: "Lục giác" },
  { value: "cross",   label: "Chữ thập" },
];

interface Props {
  style: GraphStyle;
  activePreset: string;
  onStyleChange: (style: GraphStyle) => void;
  onPresetChange: (presetKey: string) => void;
}

export default function GraphStylePanel({ style, activePreset, onStyleChange, onPresetChange }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"node" | "particle" | "edge" | "glow" | "physics">("particle");

  // Custom templates — load once on mount, persist on any change
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    setCustomTemplates(loadTemplatesFromStorage());
  }, []);

  const saveTemplate = useCallback(() => {
    const name = newTemplateName.trim();
    if (!name) return;
    const tpl: CustomTemplate = {
      id: `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name,
      createdAt: Date.now(),
      style: { ...style },
    };
    const next = [...customTemplates, tpl];
    setCustomTemplates(next);
    persistTemplatesToStorage(next);
    setNewTemplateName("");
  }, [newTemplateName, style, customTemplates]);

  const applyTemplate = useCallback((tpl: CustomTemplate) => {
    onStyleChange(normalizeGraphStyle(tpl.style));
  }, [onStyleChange]);

  const deleteTemplate = useCallback((id: string) => {
    const next = customTemplates.filter((t) => t.id !== id);
    setCustomTemplates(next);
    persistTemplatesToStorage(next);
  }, [customTemplates]);

  const update = <K extends keyof GraphStyle>(key: K, value: GraphStyle[K]) => {
    onStyleChange({ ...style, [key]: value });
  };

  return (
    <div className="absolute bottom-4 right-4 z-50 select-none font-sans">
      {/* Toggle — uses Paperclip theme tokens */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium bg-card border border-border text-foreground shadow-lg hover:bg-accent transition-colors"
      >
        <Palette size={14} />
        <span>Phong cách</span>
        {open ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute bottom-11 right-0 w-96 rounded-md overflow-hidden max-h-[85vh] overflow-y-auto bg-popover border border-border shadow-2xl text-popover-foreground">
          {/* Header — sticky */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border sticky top-0 bg-popover z-10">
            <Sliders size={14} className="text-primary" />
            <span className="text-xs font-semibold text-foreground">Điều chỉnh Đồ Thị</span>
            <span className="ml-auto text-[9px] text-muted-foreground">{Object.keys(GRAPH_PRESETS).length} presets</span>
          </div>

          <div className="p-4 space-y-4">
            {/* ── Preset Templates ── */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Template nhanh</p>
              <div className="grid grid-cols-5 gap-1">
                {Object.entries(PRESET_META).map(([key, meta]) => (
                  <button
                    key={key}
                    onClick={() => onPresetChange(key)}
                    title={meta.label}
                    className={`flex flex-col items-center gap-1 p-1.5 rounded-md transition-all border ${
                      activePreset === key
                        ? "bg-accent border-ring text-foreground"
                        : "bg-muted/40 border-border hover:bg-accent text-muted-foreground"
                    }`}
                  >
                    <span className="text-base leading-none">{meta.emoji}</span>
                    <span className="text-[8px]">{meta.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Custom Templates ── */}
            <div className="border-t border-border pt-3">
              <button
                onClick={() => setShowTemplates((v) => !v)}
                className="w-full flex items-center justify-between text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 hover:text-foreground"
              >
                <span>Template của tôi ({customTemplates.length})</span>
                {showTemplates ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
              </button>
              {showTemplates && (
                <div className="space-y-2">
                  {/* Save new */}
                  <div className="flex gap-1">
                    <input
                      type="text"
                      placeholder="Tên template mới..."
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveTemplate(); }}
                      className="flex-1 px-2 py-1 bg-background border border-input rounded text-[10px] text-foreground placeholder:text-muted-foreground outline-none focus:border-ring"
                    />
                    <button
                      onClick={saveTemplate}
                      disabled={!newTemplateName.trim()}
                      className="px-2 py-1 bg-primary/15 hover:bg-primary/25 disabled:opacity-30 disabled:cursor-not-allowed border border-primary/40 rounded text-[10px] text-primary flex items-center gap-1"
                      title="Lưu style hiện tại thành template"
                    >
                      <Save size={10} /> Lưu
                    </button>
                  </div>
                  {/* List */}
                  {customTemplates.length === 0 ? (
                    <p className="text-[9px] text-muted-foreground italic text-center py-2">Chưa có template nào. Điều chỉnh style rồi nhập tên và bấm Lưu.</p>
                  ) : (
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {customTemplates.map((tpl) => (
                        <div key={tpl.id} className="flex items-center gap-1 bg-muted/50 border border-border rounded px-2 py-1">
                          <button
                            onClick={() => applyTemplate(tpl)}
                            className="flex-1 text-left text-[10px] text-foreground hover:text-foreground truncate"
                            title={`Áp dụng "${tpl.name}"`}
                          >
                            {tpl.name}
                          </button>
                          <button
                            onClick={() => deleteTemplate(tpl.id)}
                            className="text-muted-foreground hover:text-destructive p-0.5"
                            title="Xóa template"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Tab Nav ── */}
            <div className="flex flex-wrap rounded-md overflow-hidden border border-border">
              {(["particle", "edge", "node", "glow", "physics"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 text-[9px] py-1.5 transition-colors ${
                    tab === t
                      ? "bg-accent text-foreground font-semibold"
                      : "bg-transparent text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  {t === "particle" ? "🔵 Hạt" : t === "edge" ? "🔗 Cạnh" : t === "node" ? "⭕ Nốt" : t === "glow" ? "✨ Sáng" : "🌀 Vật lý"}
                </button>
              ))}
            </div>

            {/* ── Tab: Particle ── */}
            {tab === "particle" && (
              <div className="space-y-2.5">
                <SliderRow label="Kích thước" value={style.particleSize} min={0.3} max={10.0} step={0.1} onChange={(v) => update("particleSize", v)} accent="#00F0FF" />
                <SliderRow label="Tốc độ" value={style.particleSpeed} min={0.1} max={5.0} step={0.05} onChange={(v) => update("particleSpeed", v)} accent="#00F0FF" />
                <SliderRow label="Số lượng (chọn)" value={style.particleCount} min={1} max={30} step={1} onChange={(v) => update("particleCount", Math.round(v))} accent="#00F0FF" />
                <SliderRow label="Halo (particleGlow)" value={style.particleGlow ?? 2.2} min={0} max={8} step={0.1} onChange={(v) => update("particleGlow", v)} accent="#00F0FF" />
                <ColorRow label="Màu hạt" value={style.particleColor} onChange={(v) => update("particleColor", v)} />
                <div className="border-t border-border/60 pt-2">
                  <ToggleRow label="Hạt ambient (luôn hiện)" checked={style.ambientParticles} onChange={(v) => update("ambientParticles", v)} />
                  {style.ambientParticles && (
                    <>
                      <div className="mt-2">
                        <SliderRow label="SL ambient/cạnh" value={style.ambientParticleCount} min={1} max={15} step={1} onChange={(v) => update("ambientParticleCount", Math.round(v))} accent="#7dd3fc" />
                      </div>
                      <div className="mt-2">
                        <SliderRow label="Độ mờ ambient" value={style.ambientParticleAlpha} min={0.05} max={1.0} step={0.05} onChange={(v) => update("ambientParticleAlpha", v)} accent="#7dd3fc" />
                      </div>
                      <div className="mt-2">
                        <SliderRow label="Size ambient" value={style.ambientParticleSize ?? 1.0} min={0.3} max={3.0} step={0.05} onChange={(v) => update("ambientParticleSize", v)} accent="#7dd3fc" />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ── Tab: Edge ── */}
            {tab === "edge" && (
              <div className="space-y-2.5">
                <ColorRow label="Màu highlight" value={style.edgeHighlightColor} onChange={(v) => update("edgeHighlightColor", v)} />
                <SliderRow label="Sáng (highlight)" value={style.edgeHighlightOpacity} min={0.0} max={1.0} step={0.05} onChange={(v) => update("edgeHighlightOpacity", v)} accent="#FFBD59" />
                <SliderRow label="Độ dày (highlight)" value={style.edgeHighlightWidth} min={1} max={15} step={0.5} onChange={(v) => update("edgeHighlightWidth", v)} accent="#FFBD59" />
                <div className="border-t border-border/60 pt-2 space-y-2.5">
                  <ColorRow label="Màu bình thường" value={style.edgeDefaultColor} onChange={(v) => update("edgeDefaultColor", v)} />
                  <SliderRow label="Mờ (bình thường)" value={style.edgeDefaultOpacity} min={0.0} max={1.0} step={0.02} onChange={(v) => update("edgeDefaultOpacity", v)} accent="#64748b" />
                  <SliderRow label="Độ dày (mặc định)" value={style.edgeDefaultWidth ?? 1.5} min={0.5} max={15} step={0.5} onChange={(v) => update("edgeDefaultWidth", v)} accent="#64748b" />
                </div>
                <div className="border-t border-border/60 pt-2 space-y-1">
                  <SliderRow label="Độ cong (bow)" value={style.edgeCurve ?? 0} min={0} max={2.0} step={0.05} onChange={(v) => update("edgeCurve", v)} accent="#a78bfa" />
                  <p className="text-[9px] text-muted-foreground italic">0 = thẳng, &gt;0 = cong. Cạnh cong giảm chồng chéo.</p>
                </div>
              </div>
            )}

            {/* ── Tab: Node ── */}
            {tab === "node" && (
              <div className="space-y-2.5">
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1.5">Hình dạng nốt</p>
                  <div className="grid grid-cols-5 gap-1">
                    {NODE_SHAPES.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => update("nodeShape", s.value)}
                        className={`py-1.5 rounded text-[10px] transition-colors border ${
                          style.nodeShape === s.value
                            ? "bg-accent border-ring text-foreground"
                            : "bg-muted/40 border-border text-muted-foreground hover:bg-accent/60"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <SliderRow label="Kích thước nốt" value={style.nodeSizeMultiplier} min={0.4} max={5.0} step={0.1} onChange={(v) => update("nodeSizeMultiplier", v)} accent="#a78bfa" />
                <SliderRow label="Cỡ chữ nhãn" value={style.textSize ?? 1.0} min={0.3} max={4.0} step={0.1} onChange={(v) => update("textSize", v)} accent="#a78bfa" />
                <div className="border-t border-border/60 pt-2 space-y-2.5">
                  <SliderRow label="Opacity base" value={style.nodeBaseOpacity ?? 0.9} min={0.3} max={1.0} step={0.02} onChange={(v) => update("nodeBaseOpacity", v)} accent="#a78bfa" />
                  <SliderRow label="Opacity floor (dim)" value={style.nodeOpacityFloor ?? 0.12} min={0.02} max={0.5} step={0.01} onChange={(v) => update("nodeOpacityFloor", v)} accent="#a78bfa" />
                  <p className="text-[9px] text-muted-foreground italic">Floor = opacity khi node KHÔNG được highlight. Tăng để thấy rõ hơn các node nền.</p>
                </div>
                <div className="border-t border-border/60 pt-2 space-y-2.5">
                  <ColorRow label="Viền nốt" value={style.nodeBorderColor ?? "#ffffff"} onChange={(v) => update("nodeBorderColor", v)} />
                  <SliderRow label="Độ dày viền" value={style.nodeBorderWidth ?? 0} min={0} max={5} step={0.1} onChange={(v) => update("nodeBorderWidth", v)} accent="#a78bfa" />
                </div>
                <div className="border-t border-border/60 pt-2 space-y-2.5">
                  <ColorRow label="Viền chọn" value={style.selectionRingColor} onChange={(v) => update("selectionRingColor", v)} />
                  <SliderRow label="Cỡ viền chọn" value={style.selectionRingSize} min={1.1} max={5.0} step={0.1} onChange={(v) => update("selectionRingSize", v)} accent="#a78bfa" />
                </div>
              </div>
            )}

            {/* ── Tab: Glow (Sáng) ── */}
            {tab === "glow" && (
              <div className="space-y-2.5">
                <SliderRow label="Cường độ Glow" value={style.nodeGlowIntensity} min={0} max={10.0} step={0.1} onChange={(v) => update("nodeGlowIntensity", v)} accent="#E879F9" />
                <p className="text-[10px] text-muted-foreground italic">Glow là hào quang phát sáng bao quanh nốt.</p>
                <div className="border-t border-border/60 pt-2 space-y-2.5">
                  <ColorRow label="Nền (background)" value={style.backgroundColor ?? "#030712"} onChange={(v) => update("backgroundColor", v)} />
                </div>
                <div className="border-t border-border/60 pt-2 space-y-2">
                  <ToggleRow label="Starfield (sao nền)" checked={style.starfield ?? false} onChange={(v) => update("starfield", v)} />
                  {style.starfield && (
                    <>
                      <SliderRow label="Mật độ sao" value={style.starfieldDensity ?? 3000} min={500} max={10000} step={100} onChange={(v) => update("starfieldDensity", Math.round(v))} accent="#F0F9FF" />
                      <SliderRow label="Tốc độ xoay sao" value={style.starfieldSpeed ?? 0.4} min={0} max={2.0} step={0.05} onChange={(v) => update("starfieldSpeed", v)} accent="#F0F9FF" />
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ── Tab: Physics ── */}
            {tab === "physics" && (
              <div className="space-y-2.5">
                <SliderRow label="Khoảng cách link" value={style.linkDistance ?? 40} min={10} max={1000} step={5} onChange={(v) => update("linkDistance", v)} accent="#f59e0b" />
                <SliderRow label="Lực đẩy charge" value={(style.chargeStrength ?? -150) * -1} min={10} max={2000} step={10} onChange={(v) => update("chargeStrength", v * -1)} accent="#f59e0b" />
                <SliderRow label="Tốc độ xoay vũ trụ" value={style.rotationSpeed ?? 0.15} min={0} max={10.0} step={0.05} onChange={(v) => update("rotationSpeed", v)} accent="#f59e0b" />
                <div className="border-t border-border/60 pt-2 space-y-2.5">
                  <SliderRow label="Bán kính va chạm" value={style.collideRadius ?? 16} min={0} max={40} step={1} onChange={(v) => update("collideRadius", Math.round(v))} accent="#fbbf24" />
                  <SliderRow label="Lực kéo về tâm" value={style.centerStrength ?? 0.1} min={0} max={1.0} step={0.01} onChange={(v) => update("centerStrength", v)} accent="#fbbf24" />
                </div>
                <div className="border-t border-border/60 pt-2 space-y-2.5">
                  <SliderRow label="Camera FOV" value={style.cameraFov ?? 60} min={30} max={90} step={1} onChange={(v) => update("cameraFov", Math.round(v))} accent="#34d399" />
                  <SliderRow label="Orbit damping" value={style.cameraDamping ?? 0.1} min={0.02} max={0.5} step={0.01} onChange={(v) => update("cameraDamping", v)} accent="#34d399" />
                </div>
                <p className="text-[9px] text-muted-foreground italic mt-2">Tham số vật lý sẽ định hình lại toàn bộ cấu trúc đồ thị ngay lập tức.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components (Paperclip theme tokens) ───
function SliderRow({
  label, value, min, max, step, onChange, accent,
}: {
  label: string; value: number; min: number; max: number;
  step: number; onChange: (v: number) => void; accent: string;
}) {
  const display = step >= 1 ? Math.round(value) : value.toFixed(step < 0.1 ? 2 : 1);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground w-32 shrink-0">{label}</span>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        aria-label={label}
        title={label}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: accent }}
      />
      <span className="text-[10px] font-mono text-foreground w-8 text-right">{display}</span>
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground w-32 shrink-0">{label}</span>
      <input
        type="color"
        value={value || "#000000"}
        aria-label={label}
        title={label}
        onChange={(e) => onChange(e.target.value)}
        className="w-7 h-5 rounded cursor-pointer border border-border bg-transparent"
      />
      <span className="text-[10px] font-mono text-muted-foreground">{value || "(inherit)"}</span>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={`w-8 h-4 rounded-full transition-colors relative ${
          checked ? "bg-primary" : "bg-muted border border-border"
        }`}
        aria-label={label}
        title={label}
      >
        <div
          className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${
            checked ? "bg-primary-foreground" : "bg-muted-foreground"
          }`}
          style={{ left: checked ? "18px" : "2px" }}
        />
      </button>
    </div>
  );
}
