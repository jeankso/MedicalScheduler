// Database and API response types

export interface DatabaseStatus {
  connected: boolean;
  message: string;
}

export interface BackupFile {
  filename: string;
  size: number;
  created: string;
}

export interface BackupCreateResponse {
  message: string;
  filename: string;
  size: number;
  created: string;
}

export interface ApiError {
  message: string;
}