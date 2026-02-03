export interface Profile {
  id: string;
  email: string;
  role: 'photographer' | 'client';
}

export interface Gallery {
  id: string;
  photographer_id: string;
  client_name: string;
  title: string;
  agreed_balance: number;
  amount_paid: number;
  link_enabled: boolean;
  selection_enabled: boolean; // New: Toggle selection mode
  selection_status: 'pending' | 'submitted' | 'completed'; // New: Workflow status
  created_at: string;
}

export interface GalleryFile {
  id: string;
  gallery_id: string;
  file_url: string;
  file_path: string; // Storage path for deletion
  file_type: 'image' | 'video';
  created_at: string;
  expires_at: string;
  download_count: number;
}

export interface Selection {
  gallery_id: string;
  file_id: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  gallery_id: string;
  action: string;
  timestamp: string;
}