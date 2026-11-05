/**
 * Google Drive Cloud Synchronization & Backup Engine for Veo App
 * Automatically backs up vehicle data, logs, parts, and GPS routes to user's personal Google Drive.
 */

export interface CloudBackupData {
  version: number;
  appName: string;
  timestamp: string;
  userEmail: string;
  data: {
    vehicles: any[];
    entries: any[];
    parts: any[];
    background?: any;
    cockpitTheme?: any;
    gpsTrips?: any[];
  };
}

const BACKUP_FILE_NAME = 'veo_automotive_cloud_backup.json';

/**
 * Searches for existing backup file on Google Drive
 */
export async function findDriveBackupFile(accessToken: string): Promise<string | null> {
  try {
    const q = encodeURIComponent(`name = '${BACKUP_FILE_NAME}' and trashed = false`);
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime)`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      console.warn('Drive search error:', res.status, await res.text());
      return null;
    }

    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
    return null;
  } catch (err) {
    console.warn('Drive search failed:', err);
    return null;
  }
}

/**
 * Uploads or updates backup file on Google Drive
 */
export async function uploadToGoogleDrive(accessToken: string, backupData: CloudBackupData): Promise<{ success: boolean; fileId?: string; error?: string }> {
  try {
    const existingFileId = await findDriveBackupFile(accessToken);
    const metadata = {
      name: BACKUP_FILE_NAME,
      mimeType: 'application/json',
      description: 'Veo App Automotive Log Cloud Backup - Tự động đồng bộ từ ứng dụng Veo',
    };

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(backupData, null, 2) +
      closeDelimiter;

    let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    let method = 'POST';

    if (existingFileId) {
      url = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`;
      method = 'PATCH';
    }

    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Lỗi tải lên Google Drive (${res.status}): ${errText}` };
    }

    const result = await res.json();
    return { success: true, fileId: result.id };
  } catch (err: any) {
    return { success: false, error: err.message || 'Lỗi kết nối Google Drive' };
  }
}

/**
 * Downloads and restores backup file from Google Drive
 */
export async function downloadFromGoogleDrive(accessToken: string): Promise<{ success: boolean; data?: CloudBackupData; error?: string }> {
  try {
    const fileId = await findDriveBackupFile(accessToken);
    if (!fileId) {
      return { success: false, error: 'Chưa có bản sao lưu nào trên Google Drive của bạn.' };
    }

    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      return { success: false, error: `Không thể tải dữ liệu từ Google Drive (${res.status})` };
    }

    const json = await res.json();
    return { success: true, data: json };
  } catch (err: any) {
    return { success: false, error: err.message || 'Lỗi tải bản sao lưu từ Google Drive' };
  }
}
