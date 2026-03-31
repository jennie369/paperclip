// ============================================================================
// Backup Service — Sao lưu & Khôi phục dữ liệu
// GEM Content Control Center
//
// Xuất toàn bộ dữ liệu người dùng sang JSON, khôi phục từ bản sao lưu,
// tải lên/tải về qua Supabase Storage bucket 'backups'.
// ============================================================================

import { getSupabase } from '../api/supabase';
import type { ServiceResponse } from '@gem/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Cấu trúc dữ liệu sao lưu */
export interface BackupData {
  readonly version: string;
  readonly createdAt: string;
  readonly userId: string;
  readonly tables: {
    readonly scripts?: unknown[];
    readonly titles?: unknown[];
    readonly socialPosts?: unknown[];
    readonly imagePrompts?: unknown[];
    readonly calendarEvents?: unknown[];
    readonly generationJobs?: unknown[];
  };
  readonly metadata: {
    readonly totalRecords: number;
    readonly tablesCounts: Record<string, number>;
  };
}

/** Thông tin bản sao lưu trong Storage */
export interface BackupInfo {
  readonly name: string;
  readonly path: string;
  readonly size: number;
  readonly createdAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BACKUP_VERSION = '1.0.0';
const STORAGE_BUCKET = 'backups';

/** Danh sách bảng cần sao lưu */
const BACKUP_TABLES = [
  'cc_scripts',
  'cc_titles',
  'cc_social_posts',
  'cc_image_prompts',
  'cc_calendar_events',
  'cc_generation_jobs',
] as const;

/** Map tên bảng sang key trong BackupData */
const TABLE_KEY_MAP: Readonly<Record<string, keyof BackupData['tables']>> = {
  cc_scripts: 'scripts',
  cc_titles: 'titles',
  cc_social_posts: 'socialPosts',
  cc_image_prompts: 'imagePrompts',
  cc_calendar_events: 'calendarEvents',
  cc_generation_jobs: 'generationJobs',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function serviceError<T>(message: string): ServiceResponse<T> {
  return { data: null, error: message, success: false };
}

function serviceOk<T>(data: T): ServiceResponse<T> {
  return { data, error: null, success: true };
}

/**
 * Tạo tên file sao lưu với timestamp.
 * Format: backup_YYYY-MM-DD_HHmmss.json
 */
function generateBackupFilename(): string {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const time = now.toTimeString().split(' ')[0]?.replace(/:/g, '') ?? '000000';
  return `backup_${date}_${time}.json`;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const backupService = {
  /**
   * Xuất toàn bộ dữ liệu nội dung của người dùng sang JSON.
   *
   * Bao gồm: scripts, titles, social posts, image prompts,
   * calendar events, và generation jobs.
   */
  async exportAllData(userId: string): Promise<ServiceResponse<BackupData>> {
    try {
      const supabase = getSupabase();
      const tables: Record<string, unknown[]> = {};
      const tablesCounts: Record<string, number> = {};
      let totalRecords = 0;

      // Lấy dữ liệu từ từng bảng
      for (const tableName of BACKUP_TABLES) {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .eq('created_by', userId)
          .order('created_at', { ascending: false });

        if (error) {
          // Bỏ qua bảng lỗi, tiếp tục với bảng khác
          tables[TABLE_KEY_MAP[tableName] ?? tableName] = [];
          tablesCounts[tableName] = 0;
          continue;
        }

        const records = data ?? [];
        tables[TABLE_KEY_MAP[tableName] ?? tableName] = records;
        tablesCounts[tableName] = records.length;
        totalRecords += records.length;
      }

      const backup: BackupData = {
        version: BACKUP_VERSION,
        createdAt: new Date().toISOString(),
        userId,
        tables: tables as BackupData['tables'],
        metadata: {
          totalRecords,
          tablesCounts,
        },
      };

      return serviceOk(backup);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi xuất dữ liệu sao lưu.';
      return serviceError(message);
    }
  },

  /**
   * Khôi phục dữ liệu từ bản sao lưu JSON.
   *
   * Chèn lại dữ liệu vào các bảng tương ứng.
   * Bỏ qua bản ghi trùng ID (upsert).
   */
  async importData(
    backup: BackupData,
    userId: string,
  ): Promise<ServiceResponse<{ imported: number; errors: string[] }>> {
    try {
      // Kiểm tra phiên bản
      if (!backup.version || !backup.tables) {
        return serviceError('Định dạng file sao lưu không hợp lệ.');
      }

      const supabase = getSupabase();
      let imported = 0;
      const errors: string[] = [];

      // Import từng bảng
      const tableEntries = Object.entries(backup.tables) as Array<[string, unknown[] | undefined]>;

      // Map ngược từ key sang tên bảng
      const reverseTableMap: Record<string, string> = {};
      for (const [tableName, key] of Object.entries(TABLE_KEY_MAP)) {
        reverseTableMap[key] = tableName;
      }

      for (const [key, records] of tableEntries) {
        if (!records || records.length === 0) continue;

        const tableName = reverseTableMap[key];
        if (!tableName) {
          errors.push(`Không nhận dạng được bảng: ${key}`);
          continue;
        }

        // Cập nhật created_by thành userId hiện tại
        const updatedRecords = records.map((record) => {
          const rec = record as Record<string, unknown>;
          return {
            ...rec,
            created_by: userId,
            // Xoá id để tránh xung đột — tạo mới
            id: undefined,
          };
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await supabase
          .from(tableName as any)
          .insert(updatedRecords as never);

        if (error) {
          errors.push(`Lỗi import ${tableName}: ${error.message}`);
        } else {
          imported += updatedRecords.length;
        }
      }

      return serviceOk({ imported, errors });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi khôi phục dữ liệu từ sao lưu.';
      return serviceError(message);
    }
  },

  /**
   * Tải bản sao lưu lên Supabase Storage.
   *
   * Lưu file JSON vào bucket 'backups' với đường dẫn:
   * {userId}/{backup_filename}.json
   */
  async uploadBackup(
    userId: string,
    backup: BackupData,
  ): Promise<ServiceResponse<BackupInfo>> {
    try {
      const supabase = getSupabase();
      const filename = generateBackupFilename();
      const filePath = `${userId}/${filename}`;
      const jsonString = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });

      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, blob, {
          contentType: 'application/json',
          upsert: false,
        });

      if (error) {
        return serviceError(`Lỗi tải lên sao lưu: ${error.message}`);
      }

      const info: BackupInfo = {
        name: filename,
        path: filePath,
        size: jsonString.length,
        createdAt: new Date().toISOString(),
      };

      return serviceOk(info);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi tải lên bản sao lưu.';
      return serviceError(message);
    }
  },

  /**
   * Liệt kê các bản sao lưu có sẵn trong Storage.
   */
  async listBackups(userId: string): Promise<ServiceResponse<BackupInfo[]>> {
    try {
      const supabase = getSupabase();
      const folderPath = `${userId}/`;

      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .list(folderPath, {
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) {
        return serviceError(`Lỗi liệt kê bản sao lưu: ${error.message}`);
      }

      const backups: BackupInfo[] = (data ?? [])
        .filter((file) => file.name.endsWith('.json'))
        .map((file) => ({
          name: file.name,
          path: `${folderPath}${file.name}`,
          size: file.metadata?.size ?? 0,
          createdAt: file.created_at ?? '',
        }));

      return serviceOk(backups);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi liệt kê bản sao lưu.';
      return serviceError(message);
    }
  },

  /**
   * Tải về bản sao lưu từ Storage.
   */
  async downloadBackup(
    userId: string,
    backupName: string,
  ): Promise<ServiceResponse<BackupData>> {
    try {
      const supabase = getSupabase();
      const filePath = `${userId}/${backupName}`;

      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .download(filePath);

      if (error) {
        return serviceError(`Lỗi tải về sao lưu: ${error.message}`);
      }

      if (!data) {
        return serviceError('Không tìm thấy file sao lưu.');
      }

      const text = await data.text();
      const backup = JSON.parse(text) as BackupData;

      return serviceOk(backup);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi tải về bản sao lưu.';
      return serviceError(message);
    }
  },

  /**
   * Xoá bản sao lưu khỏi Storage.
   */
  async deleteBackup(
    userId: string,
    backupName: string,
  ): Promise<ServiceResponse<null>> {
    try {
      const supabase = getSupabase();
      const filePath = `${userId}/${backupName}`;

      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([filePath]);

      if (error) {
        return serviceError(`Lỗi xoá bản sao lưu: ${error.message}`);
      }

      return serviceOk(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi xoá bản sao lưu.';
      return serviceError(message);
    }
  },
};
