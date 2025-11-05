export interface DocumentType {
  id: string;
  title: string;
  file_url: string | null;
  created_at?: string | Date | null;
  updated_at?: string | Date | null | unknown;
  due_date?: string | Date | null;
  has_file?: boolean;
  // Add other document properties as needed
}
