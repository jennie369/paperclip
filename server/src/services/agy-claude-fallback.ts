/**
 * Heartbeat agy → claude CLI khi quỹ credits Antigravity cạn ở MỌI model (GEM-1244).
 *
 * Tín dụng Antigravity là 1 quỹ chung: adapter đã tự đổi Gemini → Claude-trong-agy (GEM-1241)
 * nhưng cả chuỗi vẫn "AI credits balance is too low" → run fail `antigravity_quota_exhausted`
 * → quota-retry chỉ hẹn 30/60/120' (đợt 05/10 cạn từ 05:50 > 3,5h ⇒ mất lượt). claude CLI có
 * quỹ độc lập ⇒ chạy lại CÙNG lượt bằng adapter `claude_local` (cwd + instructionsFilePath giữ nguyên).
 *
 * Chính sách thuần — heartbeat.ts gọi adapter + gộp kết quả. Chị-em CSKH: channels/agy-timeout-fallback.ts.
 */
import type { AdapterExecutionResult } from "../adapters/index.js";

export const AGY_ADAPTER_TYPE = "antigravity_local";
export const CLAUDE_ADAPTER_TYPE = "claude_local";
/** Alias CLI luôn trỏ Sonnet mới nhất — không ghim số phiên bản dễ lỗi thời. */
export const DEFAULT_CLAUDE_FALLBACK_MODEL = "sonnet";

/** Chỉ vách TÍN DỤNG/quota thật — đo trên stderr/errorMessage, KHÔNG trên lời agent (stdout). */
const CREDITS_WALL_RE = /credits?\s+balance|RESOURCE_EXHAUSTED/i;

/** Khoá adapterConfig per-agent: `claudeFallback: false` = giữ quota-retry (agent cần tool riêng của agy). */
export const CLAUDE_FALLBACK_CONFIG_KEY = "claudeFallback";

function readEnvSwitch(env: NodeJS.ProcessEnv): boolean {
  const mode = (env.AGY_HEARTBEAT_CLAUDE_FALLBACK || "on").trim().toLowerCase();
  return !(mode === "off" || mode === "0" || mode === "false" || mode === "none");
}

/** true ⇒ heartbeat chạy lại lượt này bằng claude_local. */
export function shouldFallbackToClaude(input: {
  adapterType: string;
  config: Record<string, unknown>;
  result: Pick<AdapterExecutionResult, "errorCode" | "errorMessage" | "resultJson">;
  cancelled?: boolean;
  env?: NodeJS.ProcessEnv;
}): boolean {
  const { adapterType, config, result } = input;
  if (input.cancelled) return false;
  if (adapterType !== AGY_ADAPTER_TYPE) return false;
  if (!readEnvSwitch(input.env ?? process.env)) return false;
  if (config[CLAUDE_FALLBACK_CONFIG_KEY] === false) return false;
  if (result.errorCode !== "antigravity_quota_exhausted") return false;
  const stderr = typeof result.resultJson?.stderr === "string" ? result.resultJson.stderr : "";
  return CREDITS_WALL_RE.test(`${result.errorMessage ?? ""}\n${stderr}`);
}

/**
 * agy config → claude_local config. Giữ thứ chung (cwd, instructions*, prompt, env, timeout);
 * bỏ khoá riêng agy (model nhãn agy, printTimeout, conversationId, fallbackModels, extraArgs, effort).
 */
export function buildClaudeFallbackConfig(
  agyConfig: Record<string, unknown>,
  env: NodeJS.ProcessEnv = process.env,
): Record<string, unknown> {
  const KEEP = [
    "cwd",
    "instructionsFilePath",
    "instructionsRootPath",
    "instructionsEntryFile",
    "instructionsBundleMode",
    "promptTemplate",
    "bootstrapPromptTemplate",
    "env",
    "timeoutSec",
    "graceSec",
    "paperclipRuntimeSkills",
  ] as const;
  const out: Record<string, unknown> = {};
  for (const key of KEEP) {
    if (agyConfig[key] !== undefined) out[key] = agyConfig[key];
  }
  out.model = (env.AGY_HEARTBEAT_CLAUDE_FALLBACK_MODEL || "").trim() || DEFAULT_CLAUDE_FALLBACK_MODEL;
  // Heartbeat không có người bấm duyệt quyền — giống mọi agent claude_local đang chạy.
  out.dangerouslySkipPermissions = true;
  return out;
}

/**
 * Gộp kết quả: claude thành công ⇒ lấy kết quả claude nhưng GIỮ phiên agy (brain id) để lượt sau
 * agy resume đúng brain, không lưu session claude vào task-session của agy. claude thất bại ⇒ giữ
 * kết quả quota của agy (quota-retry vẫn hẹn lại) + ghi lỗi claude để soi.
 */
export function mergeClaudeFallbackResult(
  agy: AdapterExecutionResult,
  claude: AdapterExecutionResult,
  claudeModel: string,
): AdapterExecutionResult {
  const claudeOk = !claude.timedOut && (claude.exitCode ?? 0) === 0 && !claude.errorMessage;
  const agyMeta = {
    adapterPrimary: AGY_ADAPTER_TYPE,
    agyErrorCode: agy.errorCode ?? null,
    agyErrorMessage: agy.errorMessage ?? null,
    ...(agy.resultJson?.modelsTried ? { agyModelsTried: agy.resultJson.modelsTried } : {}),
  };
  if (!claudeOk) {
    return {
      ...agy,
      resultJson: {
        ...(agy.resultJson ?? {}),
        adapterUsed: AGY_ADAPTER_TYPE,
        claudeFallback: {
          attempted: true,
          model: claudeModel,
          exitCode: claude.exitCode,
          timedOut: claude.timedOut,
          errorCode: claude.errorCode ?? null,
          errorMessage: claude.errorMessage ?? null,
        },
      },
    };
  }
  return {
    ...claude,
    sessionId: agy.sessionId,
    sessionParams: agy.sessionParams,
    sessionDisplayId: agy.sessionDisplayId,
    clearSession: false,
    resultJson: {
      ...(claude.resultJson ?? {}),
      adapterUsed: CLAUDE_ADAPTER_TYPE,
      claudeFallbackModel: claudeModel,
      ...agyMeta,
    },
  };
}
