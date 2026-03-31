/**
 * Whisper Transcription Service
 *
 * TypeScript service that wraps Tauri desktop commands for local
 * Whisper transcription. Falls back with a clear error message
 * when running in a web browser environment.
 *
 * Desktop: Uses tauri invoke to call whisper.cpp via Rust commands
 * Web: Throws descriptive error in Vietnamese
 */

// Tauri invoke type for dynamic import
type TauriInvokeFn = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

export interface TranscriptionResult {
  text: string;
  language: string | null;
  duration_seconds: number;
  segments: TranscriptionSegment[];
}

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

export interface VideoInfo {
  duration_seconds: number;
  format: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  codec: string | null;
}

export type ProgressCallback = (progress: {
  stage: "extracting" | "transcribing" | "complete" | "error";
  percent: number;
  message: string;
}) => void;

// ------------------------------------------------------------------
// Environment detection
// ------------------------------------------------------------------

/**
 * Check whether the app is running inside the Tauri desktop shell.
 */
function isTauriEnvironment(): boolean {
  return !!(window as any).__TAURI_INTERNALS__;
}

/**
 * Dynamically import the Tauri invoke function.
 * This avoids bundling errors when the web app loads without Tauri.
 */
async function getTauriInvoke(): Promise<TauriInvokeFn> {
  if (!isTauriEnvironment()) {
    throw new Error("Chức năng này chỉ khả dụng trên Desktop");
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = await (Function('return import("@tauri-apps/api/core")')() as Promise<{ invoke: TauriInvokeFn }>);
  return mod.invoke;
}

// ------------------------------------------------------------------
// Public API
// ------------------------------------------------------------------

/**
 * Transcribe an audio file using local Whisper model.
 *
 * @param audioPath - Absolute path to the audio file (WAV 16kHz mono preferred)
 * @param onProgress - Optional callback for progress updates
 * @param modelPath - Path to the Whisper GGML model file.
 *                    Defaults to D:\GEM-Content-Agent\models\ggml-base.bin
 * @returns Transcription result with text, segments, and metadata
 * @throws Error with Vietnamese message when not on Desktop
 */
export async function transcribe(
  audioPath: string,
  onProgress?: ProgressCallback,
  modelPath: string = "D:\\GEM-Content-Agent\\models\\ggml-base.bin"
): Promise<TranscriptionResult> {
  const invoke = await getTauriInvoke();

  try {
    onProgress?.({
      stage: "transcribing",
      percent: 10,
      message: "Starting Whisper transcription...",
    });

    const result = await invoke<TranscriptionResult>("transcribe_audio", {
      audioPath,
      modelPath,
    });

    onProgress?.({
      stage: "complete",
      percent: 100,
      message: "Transcription complete",
    });

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    onProgress?.({
      stage: "error",
      percent: 0,
      message: errorMessage,
    });

    throw new Error(`Transcription failed: ${errorMessage}`);
  }
}

/**
 * Full pipeline: extract audio from video, then transcribe.
 *
 * @param videoPath - Absolute path to the video file
 * @param onProgress - Optional callback for progress updates
 * @param modelPath - Path to the Whisper GGML model file
 * @returns Transcription result
 * @throws Error with Vietnamese message when not on Desktop
 */
export async function transcribeVideo(
  videoPath: string,
  onProgress?: ProgressCallback,
  modelPath: string = "D:\\GEM-Content-Agent\\models\\ggml-base.bin"
): Promise<TranscriptionResult> {
  const invoke = await getTauriInvoke();

  // Step 1: Extract audio
  onProgress?.({
    stage: "extracting",
    percent: 5,
    message: "Extracting audio from video...",
  });

  // Generate output path next to the video file
  const audioOutputPath = videoPath.replace(/\.[^.]+$/, "_extracted.wav");

  await invoke<string>("extract_audio", {
    videoPath,
    outputPath: audioOutputPath,
  });

  onProgress?.({
    stage: "extracting",
    percent: 30,
    message: "Audio extraction complete",
  });

  // Step 2: Transcribe
  return transcribe(audioOutputPath, onProgress, modelPath);
}

/**
 * Check if the Whisper model file exists and is valid.
 *
 * @param modelPath - Path to the GGML model file
 * @returns Status string describing the model
 * @throws Error with Vietnamese message when not on Desktop
 */
export async function checkModelAvailable(
  modelPath: string = "D:\\GEM-Content-Agent\\models\\ggml-base.bin"
): Promise<string> {
  const invoke = await getTauriInvoke();
  return invoke<string>("check_whisper_model", { modelPath });
}

/**
 * Check if FFmpeg is installed and available.
 *
 * @returns FFmpeg version string and GPU acceleration status
 * @throws Error with Vietnamese message when not on Desktop
 */
export async function checkFfmpegAvailable(): Promise<string> {
  const invoke = await getTauriInvoke();
  return invoke<string>("check_ffmpeg_installed");
}

/**
 * Get detailed information about a video file.
 *
 * @param path - Absolute path to the video file
 * @returns Video metadata (duration, format, resolution, codec)
 * @throws Error with Vietnamese message when not on Desktop
 */
export async function getVideoInfo(path: string): Promise<VideoInfo> {
  const invoke = await getTauriInvoke();
  return invoke<VideoInfo>("get_video_info", { path });
}

/**
 * Send a native OS notification (desktop only).
 *
 * @param title - Notification title
 * @param body - Notification body text
 * @throws Error with Vietnamese message when not on Desktop
 */
export async function sendNotification(
  title: string,
  body: string
): Promise<void> {
  const invoke = await getTauriInvoke();
  await invoke<void>("send_os_notification", { title, body });
}
