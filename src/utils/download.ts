import axios from 'axios';
import { config } from '../config';

export async function downloadFile(url: string): Promise<Buffer | null> {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      maxContentLength: config.maxFileSize,
      timeout: 30000,
    });

    return Buffer.from(response.data);
  } catch (error) {
    console.error('Download error:', error);
    return null;
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

export function canSendDirectly(fileSize: number): boolean {
  return fileSize < config.maxFileSize;
}
